export const CORE_STATS = ['obedience', 'lust', 'affection', 'fear'] as const;
export const SKILLS = ['oral', 'hands', 'breasts', 'vaginal', 'anal', 'fetish', 'lesbian'] as const;

export type CoreStat = (typeof CORE_STATS)[number];
export type Skill = (typeof SKILLS)[number];
export type StatKey = CoreStat | Skill;
export type Stats = Record<StatKey, number>;

/** -1 dislike, 0 neutral, 1 like */
export type Preference = -1 | 0 | 1;

export interface CharacterRef {
  /** Rule34 character tag. */
  tag: string;
  name: string;
  series: string;
}

export interface CommissionTerms {
  purposeId: string;
  client: string;
  reqs: Partial<Stats>;
  reward: number;
  penalty: number;
  days: number;
}

export interface Girl {
  uid: string;
  ref: CharacterRef;
  /** Optional variant tag used instead of ref.tag for a consistent look. */
  look: string | null;
  stats: Stats;
  energy: number;
  prefs: Record<Skill, Preference>;
  known: Record<Skill, boolean>;
  shiftId: string;
  /** Set while she is here on commission. */
  commission: (CommissionTerms & { dueDay: number }) | null;
  /** Gold paid for her (0 for commissions). */
  paid: number;
  arrivedDay: number;
}

export interface MarketOffer {
  girl: Girl;
  price: number;
}

export interface CommissionOffer {
  id: string;
  girl: Girl;
  terms: CommissionTerms;
}

export interface Buyer {
  id: string;
  name: string;
  purposeId: string;
  reqs: Partial<Stats>;
  budget: number;
  leavesDay: number;
}

export type Outcome = 'success' | 'refused' | 'punished' | 'exhausted';

export interface SceneResult {
  uid: string;
  name: string;
  imageTag: string;
  label: string;
  scenes: string[];
  outcome: Outcome;
  text: string[];
  changes: Partial<Stats> & { energy?: number; gold?: number };
  canPunish: boolean;
}

export interface EveningReport {
  day: number;
  shifts: SceneResult[];
  upkeep: number;
  events: string[];
}

export type GameStatus = 'playing' | 'lost';

export interface GameState {
  version: 2;
  status: GameStatus;
  day: number;
  gold: number;
  reputation: number;
  sessionsUsed: number;
  girls: Girl[];
  upgrades: Record<string, number>;
  market: MarketOffer[];
  commissions: CommissionOffer[];
  buyers: Buyer[];
  scene: SceneResult | null;
  report: EveningReport | null;
  daysInRed: number;
  log: string[];
}
