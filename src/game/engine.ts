import { ACTIONS, BASE_CAPACITY, BASE_SESSIONS, CLIENT_NAMES, PUNISH_SCENES, PURPOSES, SHIFTS, UPGRADES, type Purpose } from './content';
import { allCharacters } from './characters';
import { exhaustedText, punishedText, refusedText, sceneText } from './text';
import {
  SKILLS,
  type Buyer, type CharacterRef, type CommissionOffer, type CommissionTerms, type EveningReport, type GameState,
  type Girl, type MarketOffer, type Preference, type SceneResult, type Skill, type StatKey, type Stats,
} from './types';

const START_GOLD = 600;
const UPKEEP = 10;
const NIGHT_ENERGY = 20;
const MARKET_SIZE = 3;
const COMMISSION_SIZE = 3;
const MAX_BUYERS = 3;

export type GameAction =
  | { type: 'new' }
  | { type: 'train'; uid: string; actionId: string }
  | { type: 'punish' }
  | { type: 'closeScene' }
  | { type: 'setShift'; uid: string; shiftId: string }
  | { type: 'setLook'; uid: string; look: string | null }
  | { type: 'endDay' }
  | { type: 'closeReport' }
  | { type: 'buy'; uid: string }
  | { type: 'acceptCommission'; id: string }
  | { type: 'deliver'; uid: string }
  | { type: 'sellToBuyer'; uid: string; buyerId: string }
  | { type: 'sellToDealer'; uid: string }
  | { type: 'upgrade'; id: string }
  | { type: 'scout'; ref: CharacterRef; price: number };

// ---------------------------------------------------------------- helpers

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
const pickOne = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const uid = () => Math.random().toString(36).slice(2, 10);

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const level = (s: GameState, id: string) => s.upgrades[id] ?? 0;
export const has = (s: GameState, id?: string) => !id || level(s, id) > 0;
export const sessionsPerDay = (s: GameState) => BASE_SESSIONS + level(s, 'training');
export const capacity = (s: GameState) => BASE_CAPACITY + level(s, 'dorm');
export const firstName = (g: Girl) => g.ref.name.split(' ')[0];
/** Free things are always affordable, even when in debt. */
export const canAfford = (s: GameState, cost: number) => cost <= 0 || s.gold >= cost;

// ---------------------------------------------------------------- girls

function makeGirl(ref: CharacterRef, day: number): Girl {
  const skills = Object.fromEntries(SKILLS.map((k) => [k, randInt(0, 12)])) as Record<Skill, number>;
  const order = shuffle(SKILLS);
  const prefs = Object.fromEntries(SKILLS.map((k) => [k, 0])) as Record<Skill, Preference>;
  prefs[order[0]] = 1;
  prefs[order[1]] = 1;
  prefs[order[2]] = -1;
  prefs[order[3]] = -1;
  return {
    uid: uid(),
    ref,
    look: null,
    stats: { obedience: randInt(0, 20), lust: randInt(0, 20), affection: randInt(5, 25), fear: randInt(0, 10), ...skills },
    energy: 100,
    prefs,
    known: Object.fromEntries(SKILLS.map((k) => [k, false])) as Record<Skill, boolean>,
    shiftId: 'rest',
    commission: null,
    paid: 0,
    arrivedDay: day,
  };
}

/** Tag used for her images: chosen look variant, or her character tag. */
export const imageTag = (g: Girl) => g.look ?? g.ref.tag;

const skillTotal = (g: Girl) => SKILLS.reduce((s, k) => s + g.stats[k], 0);

export function dealerPrice(g: Girl): number {
  return Math.round(100 + skillTotal(g) * 3 + g.stats.obedience * 2 + g.stats.lust);
}

/** How well she fits a set of requirements: 0..1.25 */
export function matchScore(g: Girl, reqs: Partial<Stats>): number {
  const entries = Object.entries(reqs) as [StatKey, number][];
  const ratios = entries.map(([k, v]) => g.stats[k] / v);
  if (ratios.every((r) => r >= 1)) {
    const excess = ratios.reduce((s, r) => s + (r - 1), 0) / ratios.length;
    return 1 + Math.min(0.25, excess);
  }
  const avg = ratios.reduce((s, r) => s + Math.min(1, r), 0) / ratios.length;
  return avg * avg * 0.8;
}

export function meetsReqs(g: Girl, reqs: Partial<Stats>): boolean {
  return (Object.entries(reqs) as [StatKey, number][]).every(([k, v]) => g.stats[k] >= v);
}

export function buyerOffer(g: Girl, b: Buyer): number {
  return Math.round(b.budget * matchScore(g, b.reqs));
}

/** How willing she is to do something; compared against difficulty. */
export function willingness(g: Girl, skill?: Skill): number {
  const s = g.stats;
  let w = s.obedience * 0.5 + s.lust * 0.35 + Math.max(s.affection, s.fear) * 0.25;
  if (skill) w += g.prefs[skill] * 15;
  if (g.energy < 25) w -= 20;
  return w;
}

// ---------------------------------------------------------------- offers

function scaledReqs(p: Purpose, rep: number): Partial<Stats> {
  const tier = 0.5 + (rep / 100) * 0.7 + rand(-0.05, 0.1);
  return Object.fromEntries(
    Object.entries(p.reqs).map(([k, v]) => [k, Math.round(clamp(v * tier, 10, 95) / 5) * 5]),
  ) as Partial<Stats>;
}

const reqSum = (reqs: Partial<Stats>) => Object.values(reqs).reduce((s, v) => s + (v ?? 0), 0);

function excludedTags(s: GameState): Set<string> {
  return new Set([
    ...s.girls.map((g) => g.ref.tag),
    ...s.market.map((m) => m.girl.ref.tag),
    ...s.commissions.map((c) => c.girl.ref.tag),
  ]);
}

function randomRefs(s: GameState, n: number): CharacterRef[] {
  const taken = excludedTags(s);
  return shuffle(allCharacters().filter((c) => !taken.has(c.tag))).slice(0, n);
}

function makeMarket(s: GameState): MarketOffer[] {
  const size = MARKET_SIZE + (has(s, 'scouts') ? 2 : 0);
  return randomRefs({ ...s, market: [] }, size).map((ref) => {
    const girl = makeGirl(ref, s.day);
    return { girl, price: Math.round(250 + skillTotal(girl) * 3 + girl.stats.obedience * 3 + randInt(0, 150)) };
  });
}

/** A skill is trainable when the action that trains it is unlocked. */
function trainable(s: GameState, k: StatKey): boolean {
  const action = ACTIONS.find((a) => a.skill === k);
  return !action || has(s, action.requires);
}

function makeCommission(s: GameState, ref: CharacterRef): CommissionOffer {
  // Commissions only ask for what you can currently train; buyers may ask for more.
  const doable = PURPOSES.filter((p) => (Object.keys(p.reqs) as StatKey[]).every((k) => trainable(s, k)));
  const purpose = pickOne(doable.length ? doable : PURPOSES);
  const reqs = scaledReqs(purpose, s.reputation);
  const sum = reqSum(reqs);
  const reward = Math.round((150 + sum * 3) * (1 + s.reputation / 200));
  const terms: CommissionTerms = {
    purposeId: purpose.id,
    client: pickOne(CLIENT_NAMES),
    reqs,
    reward,
    penalty: Math.round(reward * 0.3),
    days: 12 + Math.ceil(sum / 12),
  };
  return { id: uid(), girl: makeGirl(ref, s.day), terms };
}

function fillCommissions(s: GameState): CommissionOffer[] {
  const size = COMMISSION_SIZE + (has(s, 'scouts') ? 1 : 0);
  const list = [...s.commissions];
  const refs = randomRefs(s, size - list.length);
  for (const ref of refs) list.push(makeCommission({ ...s, commissions: list }, ref));
  return list;
}

function makeBuyer(s: GameState): Buyer {
  const purpose = pickOne(PURPOSES);
  const reqs = scaledReqs(purpose, s.reputation);
  return {
    id: uid(),
    name: pickOne(CLIENT_NAMES),
    purposeId: purpose.id,
    reqs,
    budget: Math.round((400 + reqSum(reqs) * 4) * (1 + s.reputation / 250)),
    leavesDay: s.day + randInt(4, 8),
  };
}

// ---------------------------------------------------------------- new game

export function newGame(): GameState {
  const s: GameState = {
    version: 2,
    status: 'playing',
    day: 1,
    gold: START_GOLD,
    reputation: 0,
    sessionsUsed: 0,
    girls: [],
    upgrades: {},
    market: [],
    commissions: [],
    buyers: [],
    scene: null,
    report: null,
    daysInRed: 0,
    log: ['Welcome, trainer. Accept a commission or buy a girl at the market to get started.'],
  };
  s.market = makeMarket(s);
  s.commissions = fillCommissions(s);
  s.buyers = [makeBuyer(s)];
  return s;
}

// ---------------------------------------------------------------- training

type Changes = SceneResult['changes'];

function applyChanges(g: Girl, delta: Partial<Stats>, changes: Changes, mult = 1): void {
  for (const [k, v] of Object.entries(delta) as [StatKey, number][]) {
    const before = g.stats[k];
    // Gains shrink as the stat approaches 100; losses do not.
    const scaled = v > 0 ? v * mult * (1 - before / 125) * rand(0.8, 1.2) : v;
    g.stats[k] = clamp(before + scaled);
    changes[k] = (changes[k] ?? 0) + (g.stats[k] - before);
  }
}

function train(s: GameState, girlUid: string, actionId: string): GameState {
  const action = ACTIONS.find((a) => a.id === actionId);
  const idx = s.girls.findIndex((g) => g.uid === girlUid);
  if (!action || idx < 0 || s.sessionsUsed >= sessionsPerDay(s) || !has(s, action.requires) || !canAfford(s, action.cost)) return s;

  const g: Girl = structuredClone(s.girls[idx]);
  const changes: Changes = {};
  const base = { uid: g.uid, name: g.ref.name, imageTag: imageTag(g), label: action.label, canPunish: false };
  let result: SceneResult;
  let gold = s.gold;

  if (g.energy < action.energy) {
    result = { ...base, scenes: ['portrait'], outcome: 'exhausted', text: [exhaustedText(g)], changes };
  } else if (action.difficulty > 0 && willingness(g, action.skill) + rand(-10, 10) < action.difficulty) {
    g.energy = clamp(g.energy - 3);
    applyChanges(g, { affection: -1 }, changes);
    result = { ...base, scenes: ['angry', 'shy', 'portrait'], outcome: 'refused', text: [refusedText(g)], changes, canPunish: true };
  } else {
    gold -= action.cost;
    g.energy = clamp(g.energy - action.energy);
    changes.energy = -action.energy;
    if (action.cost) changes.gold = -action.cost;

    const fearMult = has(s, 'dungeon') ? 1.25 : 1;
    const loveMult = has(s, 'boudoir') && action.group === 'love' ? 1.3 : 1;
    const effects: Partial<Stats> = { ...action.effects };
    if (effects.fear && effects.fear > 0) effects.fear *= fearMult;
    if (effects.affection && effects.affection > 0) effects.affection *= loveMult;

    let pref: Preference | null = null;
    let discovered = false;
    if (action.skill) {
      pref = g.prefs[action.skill];
      discovered = !g.known[action.skill];
      g.known[action.skill] = true;
      const skillMult = pref === 1 ? 1.5 : pref === -1 ? 0.6 : 1;
      applyChanges(g, { [action.skill]: 7 }, changes, skillMult);
      effects.obedience = (effects.obedience ?? 0) + 2;
      effects.lust = (effects.lust ?? 0) + (pref === 1 ? 4 : pref === -1 ? 0.5 : 2);
      if (pref === 1) effects.affection = (effects.affection ?? 0) + 1;
      if (pref === -1) {
        effects.affection = (effects.affection ?? 0) - 3;
        effects.fear = (effects.fear ?? 0) + 1;
      }
    }
    applyChanges(g, effects, changes);
    result = { ...base, scenes: action.scenes, outcome: 'success', text: sceneText(action.id, g, pref, discovered && pref !== 0), changes };
  }

  const girls = [...s.girls];
  girls[idx] = g;
  return { ...s, girls, gold, sessionsUsed: s.sessionsUsed + 1, scene: result };
}

function punish(s: GameState): GameState {
  const scene = s.scene;
  if (!scene?.canPunish) return s;
  const idx = s.girls.findIndex((g) => g.uid === scene.uid);
  if (idx < 0) return s;
  const g: Girl = structuredClone(s.girls[idx]);
  const changes: Changes = {};
  g.energy = clamp(g.energy - 5);
  applyChanges(g, { fear: 6 * (has(s, 'dungeon') ? 1.25 : 1), obedience: 4, affection: -5 }, changes);
  const girls = [...s.girls];
  girls[idx] = g;
  return {
    ...s,
    girls,
    scene: { ...scene, label: `${scene.label}: punished`, scenes: PUNISH_SCENES, outcome: 'punished', text: [punishedText(g)], changes, canPunish: false },
  };
}

// ---------------------------------------------------------------- end of day

function runShift(s: GameState, g: Girl): SceneResult {
  const shift = SHIFTS.find((x) => x.id === g.shiftId && has(s, x.requires)) ?? SHIFTS[0];
  const changes: Changes = {};
  const base = { uid: g.uid, name: g.ref.name, imageTag: imageTag(g), label: shift.label, canPunish: false };
  const n = firstName(g);

  if (shift.id === 'rest') {
    g.energy = clamp(g.energy + 30);
    changes.energy = 30;
    return { ...base, scenes: ['portrait'], outcome: 'success', text: [`${n} spent the evening resting.`], changes };
  }
  if (g.energy < shift.energy) {
    g.energy = clamp(g.energy + 15);
    return { ...base, scenes: ['portrait'], outcome: 'exhausted', text: [`${n} was too tired to work and slept instead.`], changes };
  }
  if (willingness(g, shift.skill) + rand(-10, 10) < shift.difficulty) {
    applyChanges(g, { affection: -1 }, changes);
    return { ...base, scenes: ['angry', 'shy', 'portrait'], outcome: 'refused', text: [`${n} refused to work the ${shift.label.toLowerCase()} shift.`], changes };
  }

  g.energy = clamp(g.energy - shift.energy);
  changes.energy = -shift.energy;
  const skillValue = shift.usesLust ? g.stats.lust : shift.skill ? g.stats[shift.skill] : 0;
  const pay = Math.round(
    shift.pay * (0.4 + skillValue / 80) * (0.8 + s.reputation / 200) * (1 + 0.2 * level(s, 'advert')) * rand(0.85, 1.15),
  );
  changes.gold = pay;
  const practice: Partial<Stats> = { lust: 1, obedience: 0.5 };
  if (shift.skill) {
    practice[shift.skill] = 2.5;
    g.known[shift.skill] = true;
  }
  applyChanges(g, practice, changes);
  const mood = shift.skill && g.prefs[shift.skill] === 1 ? ' She enjoyed every minute.' : shift.skill && g.prefs[shift.skill] === -1 ? ' She hated it.' : '';
  return { ...base, scenes: shift.scenes, outcome: 'success', text: [`${n} worked as ${shift.label.toLowerCase()} and earned ${pay} gold.${mood}`], changes };
}

function endDay(s: GameState): GameState {
  const events: string[] = [];
  const girls = s.girls.map((g) => structuredClone(g));
  const shifts = girls.map((g) => runShift(s, g));
  const income = shifts.reduce((sum, r) => sum + (r.changes.gold ?? 0), 0);
  const upkeep = girls.length * UPKEEP;
  const nightEnergy = NIGHT_ENERGY + (has(s, 'bath') ? 15 : 0);
  for (const g of girls) g.energy = clamp(g.energy + nightEnergy);

  const day = s.day + 1;
  let gold = s.gold + income - upkeep;
  let reputation = s.reputation;

  // Commission deadlines
  const kept: Girl[] = [];
  for (const g of girls) {
    if (g.commission && day > g.commission.dueDay) {
      gold -= g.commission.penalty;
      reputation = clamp(reputation - 5);
      events.push(`${g.commission.client} came for ${g.ref.name}, but she wasn't ready. You paid a ${g.commission.penalty}g penalty.`);
    } else {
      kept.push(g);
    }
  }

  let next: GameState = { ...s, day, gold, reputation, girls: kept, sessionsUsed: 0 };

  // Buyers come and go
  const buyers = next.buyers.filter((b) => b.leavesDay > day);
  if (buyers.length < next.buyers.length) events.push('A buyer lost patience and left.');
  if (buyers.length < MAX_BUYERS && Math.random() < 0.35) {
    buyers.push(makeBuyer(next));
    events.push('A new buyer has arrived and is looking for a girl.');
  }
  next.buyers = buyers;

  if ((day - 1) % 5 === 0) {
    next.market = makeMarket(next);
    events.push('New girls are available at the market.');
  }
  const weekly = (day - 1) % 7 === 0;
  if (weekly) next.commissions = [];
  if (weekly || (next.commissions.length < COMMISSION_SIZE && Math.random() < 0.5)) {
    next.commissions = fillCommissions(next);
    events.push('New commission requests are on the board.');
  }

  const daysInRed = gold < 0 ? s.daysInRed + 1 : 0;
  if (daysInRed > 0) events.push(`You are in debt! (${daysInRed}/5 days before the creditors take everything)`);
  next = { ...next, daysInRed, status: daysInRed >= 5 ? 'lost' : 'playing' };

  const report: EveningReport = { day: s.day, shifts, upkeep, events };
  return { ...next, report };
}

// ---------------------------------------------------------------- reducer

function removeGirl(s: GameState, girlUid: string): Girl[] {
  return s.girls.filter((g) => g.uid !== girlUid);
}

export function reducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case 'new':
      return newGame();
    case 'train':
      return train(s, a.uid, a.actionId);
    case 'punish':
      return punish(s);
    case 'closeScene':
      return { ...s, scene: null };
    case 'setShift':
      return { ...s, girls: s.girls.map((g) => (g.uid === a.uid ? { ...g, shiftId: a.shiftId } : g)) };
    case 'setLook':
      return { ...s, girls: s.girls.map((g) => (g.uid === a.uid ? { ...g, look: a.look } : g)) };
    case 'endDay':
      return s.status === 'playing' ? endDay(s) : s;
    case 'closeReport':
      return { ...s, report: null };
    case 'buy': {
      const offer = s.market.find((m) => m.girl.uid === a.uid);
      if (!offer || s.gold < offer.price || s.girls.length >= capacity(s)) return s;
      const girl = { ...offer.girl, paid: offer.price, arrivedDay: s.day };
      return { ...s, gold: s.gold - offer.price, girls: [...s.girls, girl], market: s.market.filter((m) => m !== offer) };
    }
    case 'scout': {
      if (s.gold < a.price || s.girls.length >= capacity(s) || s.girls.some((g) => g.ref.tag === a.ref.tag)) return s;
      const girl = { ...makeGirl(a.ref, s.day), paid: a.price };
      return { ...s, gold: s.gold - a.price, girls: [...s.girls, girl] };
    }
    case 'acceptCommission': {
      const offer = s.commissions.find((c) => c.id === a.id);
      if (!offer || s.girls.length >= capacity(s)) return s;
      const girl: Girl = { ...offer.girl, arrivedDay: s.day, commission: { ...offer.terms, dueDay: s.day + offer.terms.days } };
      return { ...s, girls: [...s.girls, girl], commissions: s.commissions.filter((c) => c !== offer) };
    }
    case 'deliver': {
      const g = s.girls.find((x) => x.uid === a.uid);
      if (!g?.commission || !meetsReqs(g, g.commission.reqs)) return s;
      const bonus = Math.round(g.commission.reward * (matchScore(g, g.commission.reqs) - 1));
      return {
        ...s,
        gold: s.gold + g.commission.reward + bonus,
        reputation: clamp(s.reputation + 6),
        girls: removeGirl(s, g.uid),
        log: [`Delivered ${g.ref.name} to ${g.commission.client} for ${g.commission.reward + bonus}g.`, ...s.log].slice(0, 30),
      };
    }
    case 'sellToBuyer': {
      const g = s.girls.find((x) => x.uid === a.uid);
      const b = s.buyers.find((x) => x.id === a.buyerId);
      if (!g || !b || g.commission) return s;
      const price = buyerOffer(g, b);
      return {
        ...s,
        gold: s.gold + price,
        reputation: clamp(s.reputation + (meetsReqs(g, b.reqs) ? 4 : 1)),
        girls: removeGirl(s, g.uid),
        buyers: s.buyers.filter((x) => x !== b),
        log: [`Sold ${g.ref.name} to ${b.name} for ${price}g.`, ...s.log].slice(0, 30),
      };
    }
    case 'sellToDealer': {
      const g = s.girls.find((x) => x.uid === a.uid);
      if (!g || g.commission) return s;
      const price = dealerPrice(g);
      return { ...s, gold: s.gold + price, girls: removeGirl(s, g.uid), log: [`Sold ${g.ref.name} to a dealer for ${price}g.`, ...s.log].slice(0, 30) };
    }
    case 'upgrade': {
      const u = UPGRADES.find((x) => x.id === a.id);
      const lvl = level(s, a.id);
      if (!u || lvl >= u.costs.length || s.gold < u.costs[lvl]) return s;
      return { ...s, gold: s.gold - u.costs[lvl], upgrades: { ...s.upgrades, [a.id]: lvl + 1 } };
    }
  }
}

// ---------------------------------------------------------------- save / load

const SAVE_KEY = 'htrainer-save';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 2 ? s : null;
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
