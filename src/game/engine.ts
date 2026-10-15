import { getActivity } from './activities';
import { CHARACTERS, getDef } from './characters';
import { STAT_KEYS, type Character, type DayReport, type GameState, type ReportEntry, type StatKey, type Stats } from './types';

export const DEBT = 10000;
export const DEADLINE = 60;
export const UPKEEP = 15;
const START_GOLD = 300;
const MARKET_SIZE = 3;

export type GameAction =
  | { type: 'new' }
  | { type: 'chooseStarter'; defId: string }
  | { type: 'setActivity'; defId: string; activityId: string }
  | { type: 'endDay' }
  | { type: 'dismissReport' }
  | { type: 'buy'; defId: string }
  | { type: 'sell'; defId: string }
  | { type: 'payDebt'; amount: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function rollMarket(owned: Character[]): string[] {
  const ownedIds = new Set(owned.map((c) => c.defId));
  return sample(CHARACTERS.filter((c) => !ownedIds.has(c.id)).map((c) => c.id), MARKET_SIZE);
}

export function newGame(): GameState {
  return {
    version: 1,
    status: 'choosing',
    day: 1,
    gold: START_GOLD,
    debt: DEBT,
    reputation: 10,
    owned: [],
    market: [],
    starterChoices: sample(CHARACTERS.map((c) => c.id), 3),
    report: null,
    daysInRed: 0,
  };
}

function makeCharacter(defId: string): Character {
  return { defId, stats: { ...getDef(defId).base }, energy: 100, mood: 60, activityId: 'talk' };
}

export function willingness(c: Character): number {
  return c.stats.obedience * 0.6 + c.stats.lust * 0.4 + (c.mood - 50) * 0.2;
}

export function sellPrice(c: Character): number {
  const total = STAT_KEYS.reduce((sum, k) => sum + c.stats[k], 0);
  return Math.round(getDef(c.defId).price * 0.5 + total * 5);
}

function growthMultiplier(defId: string, stat: StatKey): number {
  switch (getDef(defId).trait) {
    case 'proud': return stat === 'obedience' ? 0.7 : 1;
    case 'shy': return stat === 'lust' ? 0.7 : stat === 'charm' ? 1.3 : 1;
    case 'lustful': return stat === 'lust' || stat === 'sex' ? 1.3 : 1;
    case 'dominant': return stat === 'fetish' ? 1.3 : stat === 'obedience' ? 0.8 : 1;
    default: return 1;
  }
}

const MOOD_DELTA: Record<string, number> = { rest: 8, talk: 10, discipline: -12 };

function simulate(c: Character, reputation: number): { next: Character; entry: ReportEntry; repDelta: number } {
  const def = getDef(c.defId);
  const act = getActivity(c.activityId);
  const energyCost = act.energy * (def.trait === 'diligent' ? 0.75 : 1);
  const next: Character = { ...c, stats: { ...c.stats } };
  const changes: Partial<Stats> = {};
  const entry: ReportEntry = { defId: c.defId, activityId: act.id, outcome: 'success', gold: 0, changes, text: '' };

  if (act.kind === 'rest') {
    next.energy = clamp(c.energy - act.energy);
    next.mood = clamp(c.mood + MOOD_DELTA.rest);
    entry.text = `${def.name} rested and recovered.`;
    return { next, entry, repDelta: 0 };
  }

  if (c.energy < energyCost) {
    next.energy = clamp(c.energy + 25);
    next.mood = clamp(c.mood - 5);
    entry.outcome = 'exhausted';
    entry.activityId = 'rest';
    entry.text = `${def.name} was too exhausted for "${act.label}" and collapsed into bed.`;
    return { next, entry, repDelta: 0 };
  }

  if (willingness(c) + rand(-10, 10) < act.difficulty) {
    next.energy = clamp(c.energy - energyCost * 0.3);
    next.mood = clamp(c.mood - 8);
    entry.outcome = 'refused';
    entry.text = `${def.name} refused "${act.label}". She needs more obedience or lust.`;
    return { next, entry, repDelta: act.kind === 'job' ? -0.5 : 0 };
  }

  next.energy = clamp(c.energy - energyCost);
  next.mood = clamp(c.mood + (MOOD_DELTA[act.id] ?? (act.kind === 'job' ? -2 : -3)));
  const tired = c.energy < 30 ? 0.5 : 1;
  for (const [k, base] of Object.entries(act.gains) as [StatKey, number][]) {
    const gain = base * growthMultiplier(c.defId, k) * (1 - c.stats[k] / 125) * rand(0.8, 1.2) * tired;
    next.stats[k] = clamp(c.stats[k] + gain);
    changes[k] = next.stats[k] - c.stats[k];
  }

  if (act.kind === 'job' && act.pay && act.incomeStats) {
    const skill = act.incomeStats.reduce((s, k) => s + c.stats[k], 0) / act.incomeStats.length;
    const elegant = def.trait === 'elegant' && act.incomeStats.includes('charm') ? 1.25 : 1;
    entry.gold = Math.round(act.pay * (0.5 + skill / 100) * (0.8 + reputation / 250) * elegant * rand(0.85, 1.15));
    entry.text = `${def.name} worked as ${act.label.toLowerCase()} and earned ${entry.gold} gold.`;
    return { next, entry, repDelta: 0.5 };
  }

  entry.gold = -act.cost;
  entry.text = `${def.name} completed "${act.label}"${act.cost ? ` (cost ${act.cost} gold)` : ''}.`;
  return { next, entry, repDelta: 0 };
}

function randomEvents(state: GameState): { gold: number; events: string[] } {
  const events: string[] = [];
  let gold = 0;
  const r = Math.random();
  if (state.owned.length > 0 && r < 0.08) {
    const tip = Math.round(rand(50, 150));
    gold += tip;
    events.push(`A satisfied noble left a ${tip} gold tip.`);
  } else if (r > 0.95 && state.gold > 100) {
    const loss = Math.round(rand(30, 100));
    gold -= loss;
    events.push(`A pickpocket made off with ${loss} gold.`);
  }
  return { gold, events };
}

function endDay(state: GameState): GameState {
  let reputation = state.reputation;
  const entries: ReportEntry[] = [];
  const owned = state.owned.map((c) => {
    const { next, entry, repDelta } = simulate(c, reputation);
    reputation = clamp(reputation + repDelta);
    entries.push(entry);
    return next;
  });

  const upkeep = owned.length * UPKEEP;
  const { gold: eventGold, events } = randomEvents(state);
  const gold = state.gold + entries.reduce((s, e) => s + e.gold, 0) - upkeep + eventGold;
  const day = state.day + 1;
  const daysInRed = gold < 0 ? state.daysInRed + 1 : 0;

  const market = (day - 1) % 7 === 0 ? rollMarket(owned) : state.market;
  if ((day - 1) % 7 === 0) events.push('New characters have arrived at the market.');
  if (daysInRed > 0) events.push(`You are in debt to your suppliers! (${daysInRed}/3 days)`);

  let status = state.status;
  if (daysInRed >= 3) status = 'lost';
  else if (day > DEADLINE && state.debt > 0) status = 'lost';

  return { ...state, day, gold, reputation, owned, market, daysInRed, status, report: { day: state.day, entries, upkeep, events } satisfies DayReport };
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'new':
      return newGame();
    case 'chooseStarter': {
      const owned = [makeCharacter(action.defId)];
      return { ...state, status: 'playing', owned, market: rollMarket(owned), starterChoices: [] };
    }
    case 'setActivity':
      return { ...state, owned: state.owned.map((c) => (c.defId === action.defId ? { ...c, activityId: action.activityId } : c)) };
    case 'endDay':
      return state.status === 'playing' ? endDay(state) : state;
    case 'dismissReport':
      return { ...state, report: null };
    case 'buy': {
      const def = getDef(action.defId);
      if (state.gold < def.price || !state.market.includes(def.id)) return state;
      return {
        ...state,
        gold: state.gold - def.price,
        owned: [...state.owned, makeCharacter(def.id)],
        market: state.market.filter((id) => id !== def.id),
      };
    }
    case 'sell': {
      const c = state.owned.find((o) => o.defId === action.defId);
      if (!c || state.owned.length <= 1) return state;
      return { ...state, gold: state.gold + sellPrice(c), owned: state.owned.filter((o) => o !== c) };
    }
    case 'payDebt': {
      const amount = Math.min(action.amount, state.gold, state.debt);
      if (amount <= 0) return state;
      const debt = state.debt - amount;
      return { ...state, gold: state.gold - amount, debt, status: debt === 0 ? 'won' : state.status };
    }
  }
}

// ---- save / load (per-browser convenience) ----

const SAVE_KEY = 'htrainer-save';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // ignore - game still works without saving
  }
}
