// Hard content rules. These are NOT user-configurable and must never be
// made optional: no sexualized minors, no real people / photographs.
//
// Enforcement happens twice:
//  1. QUERY_EXCLUSIONS are sent as negative tags with every API search.
//  2. isPostAllowed() re-checks every returned post's tag list client-side,
//     so a post is dropped even if the server-side search ignored a tag.

/** Negative tags appended to every search query. */
export const QUERY_EXCLUSIONS: readonly string[] = [
  'loli',
  'shota',
  'child',
  'toddler',
  'young',
  'underage',
  'cub',
  'aged_down',
  'photo_(medium)',
  'real_person',
];

/** Exact tags that block a post outright. */
const BLOCKED_TAGS: ReadonlySet<string> = new Set([
  ...QUERY_EXCLUSIONS,
  'lolicon',
  'shotacon',
  'toddlercon',
  'babyfur',
  'baby',
  'infant',
  'kid',
  'kids',
  'minor',
  'preteen',
  'teen',
  'teenager',
  'younger',
  'young_adult',
  'age_regression',
  'age_progression',
  'agegap',
  'flat_chested_child',
  'elementary_school',
  'middle_school',
  'school_child',
  'photo',
  'photograph',
  'photorealistic',
  'real_life',
  'irl',
  'cosplay_photo',
]);

/** Substring patterns that block a post (catches variants like "loli_focus"). */
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /(^|_)lol[i1]/,
  /(^|_)shota/,
  /(^|_)child/,
  /(^|_)toddler/,
  /(^|_)underage/,
  /(^|_)preteen/,
  /(^|_)minor(_|$)/,
  /(^|_)(young|younger)(_|$)/,
  /(^|_)real_person/,
  /(^|_)photo(_|$|\()/,
];

export function isTagBlocked(tag: string): boolean {
  const t = tag.toLowerCase();
  return BLOCKED_TAGS.has(t) || BLOCKED_PATTERNS.some((re) => re.test(t));
}

/** True only if none of the post's tags are blocked. */
export function isPostAllowed(tags: readonly string[]): boolean {
  return !tags.some(isTagBlocked);
}
