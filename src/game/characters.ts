import type { CharacterRef } from './types';

// Roster rule: ONLY characters who are adults (18+) in canon. Characters who
// are minors in canon are not allowed, regardless of art style or "aged up" art.

export const ROSTER: readonly CharacterRef[] = [
  { tag: 'tifa_lockhart', name: 'Tifa Lockhart', series: 'Final Fantasy VII' },
  { tag: 'aerith_gainsborough', name: 'Aerith Gainsborough', series: 'Final Fantasy VII' },
  { tag: 'bayonetta_(character)', name: 'Bayonetta', series: 'Bayonetta' },
  { tag: 'samus_aran', name: 'Samus Aran', series: 'Metroid' },
  { tag: 'lara_croft', name: 'Lara Croft', series: 'Tomb Raider' },
  { tag: 'nico_robin', name: 'Nico Robin', series: 'One Piece' },
  { tag: 'nami_(one_piece)', name: 'Nami', series: 'One Piece' },
  { tag: 'boa_hancock', name: 'Boa Hancock', series: 'One Piece' },
  { tag: 'jill_valentine', name: 'Jill Valentine', series: 'Resident Evil' },
  { tag: 'ada_wong', name: 'Ada Wong', series: 'Resident Evil' },
  { tag: 'yoruichi_shihouin', name: 'Yoruichi Shihouin', series: 'Bleach' },
  { tag: 'yorha_2b', name: '2B', series: 'NieR:Automata' },
  { tag: 'albedo_(overlord)', name: 'Albedo', series: 'Overlord' },
  { tag: 'makima_(chainsaw_man)', name: 'Makima', series: 'Chainsaw Man' },
  { tag: 'jessica_rabbit', name: 'Jessica Rabbit', series: 'Who Framed Roger Rabbit' },
  { tag: 'rias_gremory', name: 'Rias Gremory', series: 'High School DxD' },
  { tag: 'yennefer', name: 'Yennefer', series: 'The Witcher' },
  { tag: 'triss_merigold', name: 'Triss Merigold', series: 'The Witcher' },
  { tag: 'widowmaker', name: 'Widowmaker', series: 'Overwatch' },
  { tag: 'chun-li', name: 'Chun-Li', series: 'Street Fighter' },
  { tag: 'mai_shiranui', name: 'Mai Shiranui', series: 'Fatal Fury' },
  { tag: 'morrigan_aensland', name: 'Morrigan Aensland', series: 'Darkstalkers' },
  { tag: 'tsunade', name: 'Tsunade', series: 'Naruto' },
  { tag: 'esdeath_(akame_ga_kill!)', name: 'Esdeath', series: 'Akame ga Kill!' },
  { tag: 'erza_scarlet', name: 'Erza Scarlet', series: 'Fairy Tail' },
  { tag: 'kitana', name: 'Kitana', series: 'Mortal Kombat' },
];

// ---- custom characters added by the player (per browser) ----

const CUSTOM_KEY = 'htrainer-custom-characters';

export function loadCustom(): CharacterRef[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveCustom(list: CharacterRef[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    // custom list lasts for this session only
  }
}

export function allCharacters(): CharacterRef[] {
  const custom = loadCustom();
  const tags = new Set(custom.map((c) => c.tag));
  return [...ROSTER.filter((c) => !tags.has(c.tag)), ...custom];
}

const titleCase = (s: string) => s.replace(/(^|\s|-)\S/g, (m) => m.toUpperCase());

/** "nami_(one_piece)" -> { name: "Nami", series: "One Piece" } */
export function refFromTag(tag: string): CharacterRef {
  const m = /^(.*?)_\(([^()]+)\)$/.exec(tag);
  const base = (m ? m[1] : tag).replace(/_/g, ' ');
  const series = m ? m[2].replace(/_/g, ' ') : '';
  return { tag, name: titleCase(base), series: titleCase(series) };
}
