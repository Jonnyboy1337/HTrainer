import { QUERY_EXCLUSIONS, isPostAllowed, isTagBlocked } from './contentFilter';
import type { Settings } from './settings';

const API = 'https://api.rule34.xxx/index.php';
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
const PAGE_SIZE = 100;

export interface Post {
  id: number;
  imageUrl: string;
  tags: string[];
  score: number;
}

interface RawPost {
  id: number;
  file_url: string;
  sample_url?: string;
  tags: string;
  score?: number;
}

export class ApiError extends Error {}

// ---- per-user hidden posts ("hide this image") ----

const HIDDEN_KEY = 'htrainer-hidden-posts';
let hidden: Set<number> | null = null;

function hiddenSet(): Set<number> {
  if (!hidden) {
    try {
      hidden = new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'));
    } catch {
      hidden = new Set();
    }
  }
  return hidden;
}

export function hidePost(id: number): void {
  const set = hiddenSet();
  set.add(id);
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  } catch {
    // keep in memory only
  }
}

// ---- request queue (the API rate-limits bursts with HTTP 429) ----

const MIN_GAP_MS = 350;
const MAX_RETRIES = 4;
let queue: Promise<unknown> = Promise.resolve();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs requests one at a time with a gap, retrying 429s with backoff. */
function throttledFetch(url: string): Promise<Response> {
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url);
      if (res.status !== 429 || attempt >= MAX_RETRIES) {
        await wait(MIN_GAP_MS);
        return res;
      }
      await wait(2000 * 2 ** attempt);
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

// ---- persistent result cache ----

const STORE_KEY = 'htrainer-search-cache';
const STORE_TTL_MS = 12 * 60 * 60 * 1000;
// Kept small: localStorage is ~5 MB and post tag lists are long.
const STORE_MAX_ENTRIES = 60;
const STORE_MAX_POSTS = 40;

type Stored = Record<string, { at: number; posts: Post[] }>;

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function getStored(tags: string): Post[] | null {
  const hit = readStore()[tags];
  // Re-filter on read so filter updates also apply to cached results.
  return hit && Date.now() - hit.at < STORE_TTL_MS ? hit.posts.filter((p) => isPostAllowed(p.tags)) : null;
}

function putStored(tags: string, posts: Post[]): void {
  const store = readStore();
  store[tags] = { at: Date.now(), posts: posts.slice(0, STORE_MAX_POSTS) };
  const keys = Object.keys(store).sort((a, b) => store[b].at - store[a].at);
  for (const k of keys.slice(STORE_MAX_ENTRIES)) delete store[k];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded - drop the persistent cache and keep going
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  }
}

// ---- search ----

const cache = new Map<string, Promise<Post[]>>();

function buildTags(include: string[], settings: Settings): string {
  const extra = settings.extraBlacklist.split(/\s+/).filter(Boolean);
  const negatives = [...QUERY_EXCLUSIONS, ...extra].map((t) => `-${t.replace(/^-/, '')}`);
  return [...include, ...negatives].join(' ');
}

function toPost(raw: RawPost): Post | null {
  const tags = raw.tags.trim().split(/\s+/);
  const url = raw.sample_url && IMAGE_EXT.test(raw.sample_url) ? raw.sample_url : raw.file_url;
  if (!url || !IMAGE_EXT.test(url)) return null; // skip videos
  return { id: raw.id, imageUrl: url, tags, score: raw.score ?? 0 };
}

/** Fetches (and caches) the top-scored allowed image posts for a tag set. */
export function searchPosts(include: string[], settings: Settings): Promise<Post[]> {
  if (include.some(isTagBlocked)) return Promise.resolve([]);
  const tags = buildTags([...include, 'sort:score'], settings);
  const cached = cache.get(tags);
  if (cached) return cached;
  const stored = getStored(tags);
  if (stored) {
    const p = Promise.resolve(stored);
    cache.set(tags, p);
    return p;
  }

  const params = new URLSearchParams({
    page: 'dapi',
    s: 'post',
    q: 'index',
    json: '1',
    limit: String(PAGE_SIZE),
    pid: '0',
    tags,
    user_id: settings.userId.trim(),
    api_key: settings.apiKey.trim(),
  });

  const extra = new Set(settings.extraBlacklist.split(/\s+/).filter(Boolean));

  const request = throttledFetch(`${API}?${params}`)
    .then(async (res) => {
      if (res.status === 429) throw new ApiError('Rate limited by Rule34. Wait a minute, then click to retry.');
      if (!res.ok) throw new ApiError(`API request failed (HTTP ${res.status})`);
      const text = await res.text();
      if (text.trim() === '') return [];
      const data: unknown = JSON.parse(text);
      if (typeof data === 'string') throw new ApiError(data); // e.g. "Missing authentication..."
      if (!Array.isArray(data)) {
        const msg = (data as { message?: string })?.message;
        throw new ApiError(msg ?? 'Unexpected API response');
      }
      return (data as RawPost[])
        .map(toPost)
        .filter((p): p is Post => p !== null)
        .filter((p) => isPostAllowed(p.tags) && !p.tags.some((t) => extra.has(t)));
    })
    .then((posts) => {
      putStored(tags, posts);
      return posts;
    })
    .catch((err) => {
      cache.delete(tags); // allow retry after errors
      throw err;
    });

  cache.set(tags, request);
  return request;
}

/**
 * Picks a random allowed post, trying each tag set in order until one has results.
 * Hidden posts are skipped.
 */
export async function pickPost(tagSets: string[][], settings: Settings): Promise<Post | null> {
  for (const tags of tagSets) {
    const posts = (await searchPosts(tags, settings)).filter((p) => !hiddenSet().has(p.id));
    if (posts.length > 0) return posts[Math.floor(Math.random() * posts.length)];
  }
  return null;
}

export function clearSearchCache(): void {
  cache.clear();
}
