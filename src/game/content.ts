import type { SceneId } from '../api/pools';
import type { Skill, Stats } from './types';

// ---------------------------------------------------------------- training

export type ActionGroup = 'love' | 'fear' | 'lust' | 'sex';

export interface TrainingAction {
  id: string;
  label: string;
  group: ActionGroup;
  description: string;
  /** Skill trained (sex actions). Uses her preference for that skill. */
  skill?: Skill;
  /** Image chain. If `strict`, the first scene must have enough images for the action to be offered. */
  scenes: SceneId[];
  strict: boolean;
  /** Willingness needed. 0 = she can't refuse (forced or harmless). */
  difficulty: number;
  energy: number;
  cost: number;
  requires?: string;
  effects: Partial<Stats>;
}

export const ACTIONS: readonly TrainingAction[] = [
  // love
  { id: 'talk', label: 'Talk', group: 'love', description: 'Spend time with her. Builds affection.', scenes: ['happy', 'shy', 'portrait'], strict: false, difficulty: 0, energy: 5, cost: 0, effects: { affection: 6, obedience: 2, fear: -1 } },
  { id: 'gift', label: 'Give a gift', group: 'love', description: 'A pretty present. Big affection gain.', scenes: ['happy', 'shy', 'portrait'], strict: false, difficulty: 0, energy: 0, cost: 40, effects: { affection: 11, fear: -2 } },
  { id: 'kiss', label: 'Kiss her', group: 'love', description: 'Tender and intimate.', scenes: ['kiss'], strict: true, difficulty: 15, energy: 5, cost: 0, effects: { affection: 5, lust: 5 } },
  // fear
  { id: 'scold', label: 'Scold', group: 'fear', description: 'Remind her of her place.', scenes: ['angry', 'sad', 'shy', 'portrait'], strict: false, difficulty: 0, energy: 5, cost: 0, effects: { fear: 6, obedience: 4, affection: -2 } },
  { id: 'spank', label: 'Spank', group: 'fear', description: 'Physical discipline.', scenes: ['spanking'], strict: true, difficulty: 0, energy: 10, cost: 0, effects: { fear: 8, obedience: 6, affection: -3, lust: 1 } },
  { id: 'collar', label: 'Collar and leash', group: 'fear', description: 'Treat her like a pet.', scenes: ['collar'], strict: true, difficulty: 0, energy: 10, cost: 0, requires: 'dungeon', effects: { fear: 7, obedience: 8, affection: -2 } },
  // lust
  { id: 'lingerie', label: 'Lingerie show', group: 'lust', description: 'Have her model for you.', scenes: ['lingerie'], strict: true, difficulty: 10, energy: 5, cost: 0, effects: { lust: 6, obedience: 2 } },
  { id: 'undress', label: 'Undress', group: 'lust', description: 'Make her strip completely.', scenes: ['nude'], strict: true, difficulty: 20, energy: 5, cost: 0, effects: { lust: 6, obedience: 3 } },
  { id: 'masturbate', label: 'Self-pleasure', group: 'lust', description: 'Teach her to touch herself.', scenes: ['masturbation'], strict: true, difficulty: 25, energy: 10, cost: 0, requires: 'bedroom', effects: { lust: 8 } },
  // sex
  { id: 'oral', label: 'Oral training', group: 'sex', skill: 'oral', description: 'Lips and tongue.', scenes: ['oral'], strict: true, difficulty: 35, energy: 15, cost: 0, effects: {} },
  { id: 'hands', label: 'Handjob training', group: 'sex', skill: 'hands', description: 'A firm, skilled grip.', scenes: ['hands'], strict: true, difficulty: 25, energy: 10, cost: 0, effects: {} },
  { id: 'breasts', label: 'Paizuri training', group: 'sex', skill: 'breasts', description: 'Using her chest.', scenes: ['breasts'], strict: true, difficulty: 30, energy: 10, cost: 0, effects: {} },
  { id: 'vaginal', label: 'Sex training', group: 'sex', skill: 'vaginal', description: 'The real thing.', scenes: ['vaginal'], strict: true, difficulty: 50, energy: 20, cost: 0, requires: 'bedroom', effects: {} },
  { id: 'anal', label: 'Anal training', group: 'sex', skill: 'anal', description: 'Slowly, then not so slowly.', scenes: ['anal'], strict: true, difficulty: 65, energy: 20, cost: 0, requires: 'bedroom', effects: {} },
  { id: 'fetish', label: 'Bondage training', group: 'sex', skill: 'fetish', description: 'Ropes, restraints and surrender.', scenes: ['fetish'], strict: true, difficulty: 55, energy: 20, cost: 0, requires: 'dungeon', effects: { fear: 2 } },
  { id: 'lesbian', label: 'Lesbian training', group: 'sex', skill: 'lesbian', description: 'Pleasing another woman.', scenes: ['lesbian'], strict: true, difficulty: 45, energy: 15, cost: 20, requires: 'bedroom', effects: {} },
];

export const GROUP_LABELS: Record<ActionGroup, string> = {
  love: 'Love',
  fear: 'Fear',
  lust: 'Seduction',
  sex: 'Sex training',
};

/** Shown when a refusal is answered with punishment. */
export const PUNISH_SCENES: SceneId[] = ['spanking', 'angry', 'sad', 'portrait'];

// ---------------------------------------------------------------- evening shifts

export interface Shift {
  id: string;
  label: string;
  description: string;
  skill?: Skill;
  /** Lust-based shifts pay on lust instead of a skill. */
  usesLust?: boolean;
  scenes: SceneId[];
  difficulty: number;
  energy: number;
  pay: number;
  requires?: string;
}

export const SHIFTS: readonly Shift[] = [
  { id: 'rest', label: 'Rest', description: 'Recover energy.', scenes: ['portrait'], difficulty: 0, energy: -30, pay: 0 },
  { id: 'hands', label: 'Hand service', description: 'Relief for weary customers.', skill: 'hands', scenes: ['hands'], difficulty: 25, energy: 15, pay: 35 },
  { id: 'breasts', label: 'Paizuri service', description: 'A specialty of the house.', skill: 'breasts', scenes: ['breasts'], difficulty: 30, energy: 15, pay: 45 },
  { id: 'oral', label: 'Oral service', description: 'Popular and quick.', skill: 'oral', scenes: ['oral'], difficulty: 35, energy: 20, pay: 50 },
  { id: 'strip', label: 'Strip show', description: 'Dance and undress on stage.', usesLust: true, scenes: ['nude', 'lingerie'], difficulty: 20, energy: 15, pay: 40, requires: 'stage' },
  { id: 'lesbian', label: 'Lesbian show', description: 'Perform with another girl on stage.', skill: 'lesbian', scenes: ['lesbian'], difficulty: 45, energy: 20, pay: 85, requires: 'stage' },
  { id: 'vaginal', label: 'Escort', description: 'A full night with a client.', skill: 'vaginal', scenes: ['vaginal', 'cum'], difficulty: 50, energy: 25, pay: 80, requires: 'bedroom' },
  { id: 'anal', label: 'Anal specialist', description: 'For clients with particular tastes.', skill: 'anal', scenes: ['anal'], difficulty: 65, energy: 25, pay: 95, requires: 'bedroom' },
  { id: 'fetish', label: 'Fetish club', description: 'Bound and on display.', skill: 'fetish', scenes: ['fetish'], difficulty: 55, energy: 25, pay: 110, requires: 'dungeon' },
];

// ---------------------------------------------------------------- establishment

export interface Upgrade {
  id: string;
  label: string;
  description: string;
  /** Cost per level; length = max level. */
  costs: number[];
}

export const UPGRADES: readonly Upgrade[] = [
  { id: 'training', label: 'Training room', description: '+1 training session per day per level.', costs: [600, 1500, 3500] },
  { id: 'dorm', label: 'Dormitory', description: '+1 girl capacity per level.', costs: [400, 1000, 2000, 4000] },
  { id: 'bedroom', label: 'Private bedrooms', description: 'Unlocks sex, anal, lesbian and self-pleasure training, plus Escort and Anal shifts.', costs: [800] },
  { id: 'stage', label: 'Stage', description: 'Unlocks Strip show and Lesbian show shifts.', costs: [1000] },
  { id: 'dungeon', label: 'Dungeon', description: 'Unlocks collar and bondage training, plus the Fetish club shift. Fear grows 25% faster.', costs: [1500] },
  { id: 'bath', label: 'Bathhouse', description: 'Girls recover +15 more energy each night.', costs: [1200] },
  { id: 'boudoir', label: 'Boudoir', description: 'Love actions give 30% more affection.', costs: [900] },
  { id: 'advert', label: 'Advertising', description: '+20% shift income per level.', costs: [1000, 2500] },
  { id: 'scouts', label: 'Scout network', description: '+2 girls at the market and +1 commission offer.', costs: [1500] },
];

export const BASE_SESSIONS = 2;
export const BASE_CAPACITY = 2;

// ---------------------------------------------------------------- purposes (commissions & buyers)

export interface Purpose {
  id: string;
  label: string;
  description: string;
  reqs: Partial<Stats>;
}

export const PURPOSES: readonly Purpose[] = [
  { id: 'lover', label: 'Devoted lover', description: 'A girl who adores her master.', reqs: { affection: 60, obedience: 40, vaginal: 35, oral: 25 } },
  { id: 'pet', label: 'Obedient pet', description: 'Fearful, obedient and kinky.', reqs: { fear: 50, obedience: 60, fetish: 35 } },
  { id: 'oral', label: 'Oral specialist', description: 'Talented with her mouth.', reqs: { oral: 55, obedience: 40, lust: 40 } },
  { id: 'courtesan', label: 'Courtesan', description: 'Skilled in every art of pleasure.', reqs: { oral: 40, hands: 35, breasts: 35, vaginal: 45, lust: 40 } },
  { id: 'backdoor', label: 'Anal specialist', description: 'Loves it from behind.', reqs: { anal: 55, lust: 50, obedience: 45 } },
  { id: 'harem', label: 'Harem girl', description: 'Shares her bed with other women.', reqs: { lesbian: 45, lust: 50, affection: 40 } },
  { id: 'toy', label: 'Broken toy', description: 'Terrified and completely obedient.', reqs: { fear: 70, obedience: 70 } },
  { id: 'slut', label: 'Insatiable slut', description: 'Always wants more.', reqs: { lust: 75, vaginal: 50, oral: 45 } },
];

export const CLIENT_NAMES = [
  'Lord Varric', 'Madame Ysolde', 'Baron Kessler', 'Countess Mirelle', 'Master Oduya', 'Sir Aldous',
  'The Velvet Club', 'Duke Harlan', 'Lady Seraphine', 'Merchant Tobias', 'Captain Rourke', 'The Silk Lantern',
];
