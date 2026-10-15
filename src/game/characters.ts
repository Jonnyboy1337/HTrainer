import type { CharacterDef, Stats } from './types';

// Roster rule: ONLY characters who are canonically adults. Do not add
// characters who are minors or ambiguous in canon, regardless of art style.

const s = (o: number, l: number, c: number, sv: number, sx: number, f: number): Stats => ({
  obedience: o, lust: l, charm: c, service: sv, sex: sx, fetish: f,
});

export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'tifa', name: 'Tifa Lockhart', series: 'Final Fantasy VII', tag: 'tifa_lockhart', base: s(20, 15, 45, 10, 10, 5), trait: 'shy', price: 900 },
  { id: 'bayonetta', name: 'Bayonetta', series: 'Bayonetta', tag: 'bayonetta_(character)', base: s(5, 45, 60, 20, 25, 25), trait: 'dominant', price: 1400 },
  { id: 'samus', name: 'Samus Aran', series: 'Metroid', tag: 'samus_aran', base: s(10, 10, 35, 5, 10, 5), trait: 'proud', price: 800 },
  { id: 'lara', name: 'Lara Croft', series: 'Tomb Raider', tag: 'lara_croft', base: s(10, 20, 45, 10, 15, 10), trait: 'proud', price: 1000 },
  { id: 'robin', name: 'Nico Robin', series: 'One Piece', tag: 'nico_robin', base: s(25, 20, 50, 15, 15, 10), trait: 'elegant', price: 1100 },
  { id: 'hancock', name: 'Boa Hancock', series: 'One Piece', tag: 'boa_hancock', base: s(0, 25, 70, 5, 10, 15), trait: 'proud', price: 1500 },
  { id: 'jill', name: 'Jill Valentine', series: 'Resident Evil', tag: 'jill_valentine', base: s(20, 15, 40, 10, 10, 5), trait: 'diligent', price: 850 },
  { id: 'ada', name: 'Ada Wong', series: 'Resident Evil', tag: 'ada_wong', base: s(10, 30, 55, 15, 20, 15), trait: 'elegant', price: 1200 },
  { id: 'yoruichi', name: 'Yoruichi Shihouin', series: 'Bleach', tag: 'yoruichi_shihouin', base: s(15, 40, 45, 15, 20, 15), trait: 'lustful', price: 1100 },
  { id: '2b', name: '2B', series: 'NieR:Automata', tag: '2b_(nier:automata)', base: s(35, 5, 45, 10, 5, 5), trait: 'diligent', price: 1000 },
  { id: 'albedo', name: 'Albedo', series: 'Overlord', tag: 'albedo_(overlord)', base: s(30, 55, 55, 20, 20, 20), trait: 'lustful', price: 1300 },
  { id: 'makima', name: 'Makima', series: 'Chainsaw Man', tag: 'makima_(chainsaw_man)', base: s(0, 20, 55, 10, 15, 30), trait: 'dominant', price: 1400 },
  { id: 'jessica', name: 'Jessica Rabbit', series: 'Who Framed Roger Rabbit', tag: 'jessica_rabbit', base: s(20, 35, 65, 15, 15, 10), trait: 'elegant', price: 1250 },
];

const byId = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getDef(id: string): CharacterDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Unknown character: ${id}`);
  return def;
}

export const TRAIT_INFO: Record<CharacterDef['trait'], { label: string; text: string }> = {
  proud: { label: 'Proud', text: 'Obedience grows 30% slower.' },
  shy: { label: 'Shy', text: 'Lust grows slower, charm grows faster.' },
  lustful: { label: 'Lustful', text: 'Lust and sex skill grow 30% faster.' },
  elegant: { label: 'Elegant', text: 'Earns 25% more on charm-based jobs.' },
  dominant: { label: 'Dominant', text: 'Fetish grows faster, obedience slower.' },
  diligent: { label: 'Diligent', text: 'Uses 25% less energy.' },
};
