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
  'celebrity',
  'aged_up',
];

/**
 * Real people (actors, face models) whose likeness appears in variant tags of
 * roster characters, e.g. "lara_croft_(angelina_jolie)". On Rule34 these are
 * typed as ordinary character tags, so they must be listed explicitly.
 * Add to this list whenever a new roster character has such variants.
 */
const REAL_PEOPLE: ReadonlySet<string> = new Set([
  'angelina_jolie',
  'alicia_vikander',
  'sasha_zotova',
  'julia_voth',
  'sienna_guillory',
  'milla_jovovich',
  'caroline_ribeiro',
  'ella_freya',
  'lily_gao',
]);

/** Age qualifiers in a variant tag's parentheses, e.g. "nico_robin_(teenager)". */
const MINOR_QUALIFIER = /\((child|childhood|kid|young|younger|teen|teenager|little|loli|shota|past|flashback|aged_down|young_version|toddler|preteen|minor)\)/;

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
  'childlike',
  'age_regression',
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
  /(^|_)child(ren)?(_|$)/,
  /(^|_)toddler/,
  /(^|_)underage/,
  /(^|_)preteen/,
  /(^|_)minor(_|$)/,
  /(^|_)teen(ager)?(_|$)/,
  /(^|_)real_person/,
  /(^|_)photo(_|$|\()/,
  MINOR_QUALIFIER,
];

/** "jill_valentine_(sasha_zotova)" -> "sasha_zotova" */
function variantQualifier(tag: string): string | null {
  const m = /_\(([^()]+)\)$/.exec(tag);
  return m ? m[1] : null;
}

/**
 * Exact tags known to match a pattern above without implying a minor.
 * Keep this list tiny; when in doubt, block.
 */
const PATTERN_EXCEPTIONS: ReadonlySet<string> = new Set(['child_bearing_hips']);

export function isTagBlocked(tag: string): boolean {
  const t = tag.toLowerCase();
  if (PATTERN_EXCEPTIONS.has(t)) return false;
  if (BLOCKED_TAGS.has(t) || REAL_PEOPLE.has(t)) return true;
  const q = variantQualifier(t);
  if (q && REAL_PEOPLE.has(q)) return true;
  return BLOCKED_PATTERNS.some((re) => re.test(t));
}

/** True only if none of the post's tags are blocked. */
export function isPostAllowed(tags: readonly string[]): boolean {
  return !tags.some(isTagBlocked);
}
