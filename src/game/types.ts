export const STAT_KEYS = ['obedience', 'lust', 'charm', 'service', 'sex', 'fetish'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export type TraitId = 'proud' | 'shy' | 'lustful' | 'elegant' | 'dominant' | 'diligent';

export interface CharacterDef {
  id: string;
  name: string;
  series: string;
  /** Rule34 character tag. Only canonically adult characters belong in the roster. */
  tag: string;
  base: Stats;
  trait: TraitId;
  price: number;
}

export type ActivityKind = 'rest' | 'train' | 'job';

export interface ActivityDef {
  id: string;
  label: string;
  kind: ActivityKind;
  description: string;
  /** Willingness (obedience + lust mix) needed to comply. */
  difficulty: number;
  energy: number;
  /** Gold cost for training. */
  cost: number;
  gains: Partial<Stats>;
  /** Job: stats that drive income, and base pay. */
  incomeStats?: StatKey[];
  pay?: number;
  /** Tag sets tried in order; the character tag is prepended to each. */
  imageTags: string[][];
}

export interface Character {
  defId: string;
  stats: Stats;
  energy: number;
  mood: number;
  activityId: string;
}

export type Outcome = 'success' | 'refused' | 'exhausted';

export interface ReportEntry {
  defId: string;
  activityId: string;
  outcome: Outcome;
  gold: number;
  changes: Partial<Stats>;
  text: string;
}

export interface DayReport {
  day: number;
  entries: ReportEntry[];
  upkeep: number;
  events: string[];
}

export type GameStatus = 'choosing' | 'playing' | 'won' | 'lost';

export interface GameState {
  version: 1;
  status: GameStatus;
  day: number;
  gold: number;
  debt: number;
  reputation: number;
  owned: Character[];
  market: string[];
  starterChoices: string[];
  report: DayReport | null;
  daysInRed: number;
}
