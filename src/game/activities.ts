import type { ActivityDef } from './types';

// imageTags: tried in order, each combined with the character's tag.
// The final ['solo'] entry is a safe fallback that nearly always has results.

export const ACTIVITIES: readonly ActivityDef[] = [
  {
    id: 'rest', label: 'Rest', kind: 'rest', description: 'Recover energy and mood.',
    difficulty: 0, energy: -40, cost: 0, gains: {},
    imageTags: [['sleeping'], ['bed'], ['solo']],
  },
  // ---- training ----
  {
    id: 'talk', label: 'Talk', kind: 'train', description: 'Build trust. Raises mood and a little obedience.',
    difficulty: 0, energy: 10, cost: 0, gains: { obedience: 3, charm: 1 },
    imageTags: [['smile', 'clothed'], ['solo']],
  },
  {
    id: 'discipline', label: 'Discipline', kind: 'train', description: 'Strict lessons. Big obedience gain, hurts mood.',
    difficulty: 0, energy: 20, cost: 0, gains: { obedience: 7 },
    imageTags: [['spanking'], ['blush', 'solo'], ['solo']],
  },
  {
    id: 'etiquette', label: 'Etiquette lessons', kind: 'train', description: 'Hire a tutor for poise and charm.',
    difficulty: 10, energy: 15, cost: 40, gains: { charm: 5 },
    imageTags: [['dress'], ['solo']],
  },
  {
    id: 'tease', label: 'Seduction practice', kind: 'train', description: 'Awaken her desires.',
    difficulty: 20, energy: 15, cost: 20, gains: { lust: 5, charm: 1 },
    imageTags: [['lingerie'], ['underwear'], ['solo']],
  },
  {
    id: 'train_service', label: 'Service training', kind: 'train', description: 'Oral and hand techniques.',
    difficulty: 35, energy: 25, cost: 30, gains: { service: 5, lust: 2 },
    imageTags: [['fellatio'], ['oral'], ['solo']],
  },
  {
    id: 'train_sex', label: 'Sex training', kind: 'train', description: 'Intimate practice sessions.',
    difficulty: 50, energy: 30, cost: 30, gains: { sex: 5, lust: 3 },
    imageTags: [['sex'], ['nude'], ['solo']],
  },
  {
    id: 'train_fetish', label: 'Fetish training', kind: 'train', description: 'Ropes, toys and limits.',
    difficulty: 65, energy: 30, cost: 50, gains: { fetish: 5, obedience: 2 },
    imageTags: [['bondage'], ['bdsm'], ['solo']],
  },
  // ---- jobs ----
  {
    id: 'waitress', label: 'Waitress', kind: 'job', description: 'Serve drinks in the tavern.',
    difficulty: 10, energy: 20, cost: 0, gains: { charm: 1 }, incomeStats: ['charm'], pay: 40,
    imageTags: [['maid'], ['apron'], ['solo']],
  },
  {
    id: 'dancer', label: 'Dancer', kind: 'job', description: 'Perform on stage for the crowd.',
    difficulty: 30, energy: 25, cost: 0, gains: { charm: 1, lust: 1 }, incomeStats: ['charm', 'lust'], pay: 70,
    imageTags: [['pole_dancing'], ['dancing'], ['solo']],
  },
  {
    id: 'masseuse', label: 'Masseuse', kind: 'job', description: 'Private, very thorough massages.',
    difficulty: 40, energy: 25, cost: 0, gains: { service: 1 }, incomeStats: ['service', 'charm'], pay: 90,
    imageTags: [['massage'], ['nude'], ['solo']],
  },
  {
    id: 'escort', label: 'Escort', kind: 'job', description: 'Entertain clients with her mouth and hands.',
    difficulty: 55, energy: 30, cost: 0, gains: { service: 1 }, incomeStats: ['service', 'lust'], pay: 130,
    imageTags: [['fellatio'], ['handjob'], ['solo']],
  },
  {
    id: 'courtesan', label: 'Courtesan', kind: 'job', description: 'Spend the night with a wealthy client.',
    difficulty: 65, energy: 35, cost: 0, gains: { sex: 1 }, incomeStats: ['sex', 'charm'], pay: 180,
    imageTags: [['sex'], ['nude'], ['solo']],
  },
  {
    id: 'dungeon', label: 'Fetish club', kind: 'job', description: 'Special services for special tastes.',
    difficulty: 80, energy: 40, cost: 0, gains: { fetish: 1 }, incomeStats: ['fetish', 'sex'], pay: 240,
    imageTags: [['bondage'], ['bdsm'], ['solo']],
  },
];

const byId = new Map(ACTIVITIES.map((a) => [a.id, a]));

export function getActivity(id: string): ActivityDef {
  return byId.get(id) ?? byId.get('rest')!;
}

export const PROFILE_TAGS: string[][] = [['solo', 'clothed'], ['solo']];
