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

  const request = fetch(`${API}?${params}`)
    .then(async (res) => {
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
