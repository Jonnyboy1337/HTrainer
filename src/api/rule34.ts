import { QUERY_EXCLUSIONS, isPostAllowed, isTagBlocked } from './contentFilter';
import { extraBlacklist, type Settings } from './settings';

const BASE = 'https://api.rule34.xxx';
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

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

export function hiddenPosts(): Set<number> {
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
  const set = hiddenPosts();
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

function apiUrl(params: Record<string, string>, settings: Settings): string {
  const p = new URLSearchParams({
    page: 'dapi',
    ...params,
    user_id: settings.userId.trim(),
    api_key: settings.apiKey.trim(),
  });
  return `${BASE}/index.php?${p}`;
}

async function getText(url: string): Promise<string> {
  const res = await throttledFetch(url);
  if (res.status === 429) throw new ApiError('Rate limited by Rule34. Wait a minute, then try again.');
  if (!res.ok) throw new ApiError(`API request failed (HTTP ${res.status})`);
  return res.text();
}

/** Negative tags sent with every post search: hard filter + user settings. */
function negativeTags(settings: Settings): string[] {
  const neg = [...QUERY_EXCLUSIONS, 'cosplay', 'rule_63', 'genderswap', ...extraBlacklist(settings)];
  if (settings.hideAiGenerated) neg.push('ai_generated');
  return neg.map((t) => `-${t}`);
}

function toPost(raw: RawPost): Post | null {
  const tags = raw.tags.trim().split(/\s+/);
  const url = raw.sample_url && IMAGE_EXT.test(raw.sample_url) ? raw.sample_url : raw.file_url;
  if (!url || !IMAGE_EXT.test(url)) return null; // skip videos
  return { id: raw.id, imageUrl: url, tags, score: raw.score ?? 0 };
}

/** One page of allowed image posts for a tag set (exclusions are added automatically). */
export async function fetchPosts(include: string[], settings: Settings, limit = 100): Promise<Post[]> {
  if (include.some(isTagBlocked)) return [];
  const tags = [...include, ...negativeTags(settings)].join(' ');
  const text = await getText(apiUrl({ s: 'post', q: 'index', json: '1', limit: String(limit), pid: '0', tags }, settings));
  if (text.trim() === '') return [];
  const data: unknown = JSON.parse(text);
  if (typeof data === 'string') throw new ApiError(data); // e.g. "Missing authentication..."
  if (!Array.isArray(data)) throw new ApiError((data as { message?: string })?.message ?? 'Unexpected API response');
  const extra = new Set(extraBlacklist(settings));
  return (data as RawPost[])
    .map(toPost)
    .filter((p): p is Post => p !== null)
    .filter((p) => isPostAllowed(p.tags) && !p.tags.some((t) => extra.has(t)));
}

/** Total number of posts for a raw tag query (no automatic exclusions). */
export async function countPosts(tags: string, settings: Settings): Promise<number> {
  const xml = await getText(apiUrl({ s: 'post', q: 'index', limit: '0', tags }, settings));
  const m = /count="(\d+)"/.exec(xml);
  if (!m) throw new ApiError(xml.length < 200 ? xml : 'Unexpected API response');
  return Number(m[1]);
}

export interface TagInfo {
  name: string;
  count: number;
  /** 4 = character, 3 = copyright, 1 = artist, 0 = general, 5 = metadata */
  type: number;
}

export async function tagInfo(name: string, settings: Settings): Promise<TagInfo | null> {
  const xml = await getText(apiUrl({ s: 'tag', q: 'index', name }, settings));
  const m = /<tag [^>]*type="(\d+)" count="(\d+)" name="([^"]*)"/.exec(xml);
  return m ? { type: Number(m[1]), count: Number(m[2]), name: m[3] } : null;
}

export interface Suggestion {
  tag: string;
  count: number;
}

/** Tag autocomplete (no auth needed). Blocked tags are never suggested. */
export async function autocomplete(q: string): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/autocomplete.php?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { label: string; value: string }[];
  return data
    .map((d) => ({ tag: d.value, count: Number(/\((\d+)\)$/.exec(d.label)?.[1] ?? 0) }))
    .filter((s) => !isTagBlocked(s.tag));
}

// ---- simple cached searches (used for previews) ----

const cache = new Map<string, Promise<Post[]>>();

export function searchPosts(include: string[], settings: Settings): Promise<Post[]> {
  const key = JSON.stringify([include, settings.extraBlacklist, settings.hideAiGenerated]);
  const cached = cache.get(key);
  if (cached) return cached;
  const request = fetchPosts([...include, 'sort:score'], settings).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, request);
  return request;
}

export function clearSearchCache(): void {
  cache.clear();
}
