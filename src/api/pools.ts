import { fetchPosts, hiddenPosts, type Post } from './rule34';
import type { Settings } from './settings';

// A "pool" is a girl's image library: her top-scored posts, sorted into
// scenes by tag. Two requests per girl (explicit + solo/non-nude, since
// the top-scored posts are almost all explicit), then everything is local.

export interface SceneDef {
  all?: string[];
  any?: string[];
  none?: string[];
}

const ONE = ['1girls'];
const NO_SEX = ['sex', 'vaginal_penetration', 'anal', 'fellatio', 'penis'];

export const SCENES = {
  portrait: { all: ['solo'], none: ['nude', 'completely_nude', 'nipples', 'pussy', ...NO_SEX] },
  happy: { all: ['solo'], any: ['smile', 'smiling', 'happy', 'grin'], none: NO_SEX },
  shy: { any: ['blush', 'blushing', 'embarrassed'], none: NO_SEX },
  angry: { any: ['angry', 'annoyed', 'glare', 'frown', 'pout'] },
  sad: { any: ['crying', 'tears', 'sad'] },
  kiss: { any: ['kissing', 'kiss', 'french_kiss'] },
  lingerie: { all: ONE, any: ['lingerie', 'underwear', 'bra', 'panties_only', 'stockings', 'garter_belt'], none: NO_SEX },
  nude: { all: ['solo'], any: ['nude', 'completely_nude', 'naked'], none: NO_SEX },
  masturbation: { all: ['solo'], any: ['masturbation', 'female_masturbation', 'fingering', 'fingering_self'] },
  oral: { all: ONE, any: ['fellatio', 'blowjob', 'deepthroat', 'irrumatio'] },
  hands: { all: ONE, any: ['handjob', 'two-handed_handjob'] },
  breasts: { all: ONE, any: ['paizuri', 'titjob', 'titfuck'] },
  vaginal: { all: ONE, any: ['vaginal_penetration', 'vaginal_sex'], none: ['anal', 'anal_sex'] },
  anal: { all: ONE, any: ['anal', 'anal_sex', 'anal_penetration'] },
  fetish: { all: ONE, any: ['bondage', 'bdsm', 'bound', 'tied_up', 'restrained', 'shibari', 'rope_bondage'] },
  spanking: { any: ['spanking', 'spanked', 'spank_marks'] },
  collar: { any: ['collar', 'leash', 'pet_play'] },
  lesbian: { all: ['2girls'], any: ['yuri', 'lesbian', 'lesbian_sex'] },
  cum: { all: ONE, any: ['cum', 'cum_on_face', 'cum_in_pussy', 'cum_inside', 'creampie', 'cum_on_body'] },
} satisfies Record<string, SceneDef>;

export type SceneId = keyof typeof SCENES;

/** Minimum images a scene needs before actions using it are offered. */
export const MIN_SCENE_POSTS = 5;
const MAX_PER_SCENE = 60;

export interface PoolPost {
  id: number;
  url: string;
}

export type Pool = Partial<Record<SceneId, PoolPost[]>>;

function matches(tags: Set<string>, s: SceneDef): boolean {
  return (
    (s.all ?? []).every((t) => tags.has(t)) &&
    (!s.any || s.any.some((t) => tags.has(t))) &&
    !(s.none ?? []).some((t) => tags.has(t))
  );
}

function sortIntoScenes(posts: Post[]): Pool {
  const pool: Pool = {};
  const seen = new Set<number>();
  for (const p of posts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const tags = new Set(p.tags);
    for (const [id, def] of Object.entries(SCENES) as [SceneId, SceneDef][]) {
      if (!matches(tags, def)) continue;
      const list = (pool[id] ??= []);
      if (list.length < MAX_PER_SCENE) list.push({ id: p.id, url: p.imageUrl });
    }
  }
  return pool;
}

// ---- cache: memory + localStorage ----

const STORE_KEY = 'htrainer-pools-v1';
const TTL_MS = 3 * 24 * 60 * 60 * 1000;
// ~125 KB per pool; keeps localStorage well under its ~5 MB limit.
const MAX_STORED = 12;

type Stored = Record<string, { at: number; pool: Pool }>;

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeStore(key: string, pool: Pool): void {
  const store = readStore();
  store[key] = { at: Date.now(), pool };
  const keys = Object.keys(store).sort((a, b) => store[b].at - store[a].at);
  for (const k of keys.slice(MAX_STORED)) delete store[k];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  }
}

const memory = new Map<string, Promise<Pool>>();

function poolKey(tag: string, s: Settings): string {
  return `${tag}|${s.extraBlacklist}|${s.hideAiGenerated}`;
}

export function loadPool(tag: string, settings: Settings): Promise<Pool> {
  const key = poolKey(tag, settings);
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;
  const stored = readStore()[key];
  if (stored && Date.now() - stored.at < TTL_MS) {
    const p = Promise.resolve(stored.pool);
    memory.set(key, p);
    return p;
  }
  const request = (async () => {
    const quality = ['score:>=3', 'sort:score'];
    const explicit = await fetchPosts([tag, ...quality], settings, 1000);
    const solo = await fetchPosts([tag, 'solo', '-nude', '-sex', '-nipples', ...quality], settings, 1000);
    const pool = sortIntoScenes([...explicit, ...solo]);
    writeStore(key, pool);
    return pool;
  })().catch((err) => {
    memory.delete(key);
    throw err;
  });
  memory.set(key, request);
  return request;
}

export function clearPools(): void {
  memory.clear();
}

export function sceneCount(pool: Pool, scene: SceneId): number {
  const hidden = hiddenPosts();
  return (pool[scene] ?? []).filter((p) => !hidden.has(p.id)).length;
}

export function hasScene(pool: Pool, scene: SceneId): boolean {
  return sceneCount(pool, scene) >= MIN_SCENE_POSTS;
}

/** First scene in the chain with enough images, or null. */
export function firstAvailable(pool: Pool, chain: readonly SceneId[]): SceneId | null {
  return chain.find((s) => hasScene(pool, s)) ?? null;
}

/** Random image for the first usable scene in the chain (falls back to any image at all). */
export function pickFromPool(pool: Pool, chain: readonly SceneId[], exclude?: number): PoolPost | null {
  const hidden = hiddenPosts();
  const usable = (s: SceneId) => (pool[s] ?? []).filter((p) => !hidden.has(p.id) && p.id !== exclude);
  for (const s of [...chain, 'portrait' as const]) {
    const list = usable(s);
    if (list.length > 0) return list[Math.floor(Math.random() * list.length)];
  }
  return null;
}
