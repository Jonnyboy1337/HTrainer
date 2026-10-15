import { PURPOSES, SHIFTS, UPGRADES } from '../game/content';
import { capacity, imageTag, level, meetsReqs, type GameAction } from '../game/engine';
import type { GameState, Girl } from '../game/types';
import { PostImage } from './PostImage';
import { ScenePicture } from './ScenePicture';
import { Bar, ReqList } from './Stats';

type Dispatch = (a: GameAction) => void;
const purposeLabel = (id: string) => PURPOSES.find((p) => p.id === id)?.label ?? id;

// ---------------------------------------------------------------- girls

export function GirlsTab({ state, onOpen }: { state: GameState; onOpen: (g: Girl) => void }) {
  if (state.girls.length === 0) {
    return <p className="muted">You have no girls yet. Accept a commission or visit the market.</p>;
  }
  return (
    <>
      <div className="grid">
        {state.girls.map((g) => (
          <button key={g.uid} className="card clickable" onClick={() => onOpen(g)}>
            <ScenePicture tag={imageTag(g)} scenes={['portrait']} alt={g.ref.name} />
            <div className="card-body">
              <h3>{g.ref.name}</h3>
              <div className="muted small">
                {g.commission ? `Commission · due day ${g.commission.dueDay}` : 'Owned'} · Shift: {SHIFTS.find((s) => s.id === g.shiftId)?.label}
                {g.commission && meetsReqs(g, g.commission.reqs) && <b className="ready"> · Ready to deliver!</b>}
              </div>
              <Bar label="Energy" value={g.energy} className="energy" />
              <Bar label="Obedience" value={g.stats.obedience} className="obedience" />
              <Bar label="Lust" value={g.stats.lust} className="lust" />
              <Bar label="Affection" value={g.stats.affection} className="affection" />
              <Bar label="Fear" value={g.stats.fear} className="fear" />
            </div>
          </button>
        ))}
      </div>
      <h3 className="log-title">Recent</h3>
      <ul className="log">{state.log.slice(0, 8).map((l, i) => <li key={i}>{l}</li>)}</ul>
    </>
  );
}

// ---------------------------------------------------------------- commissions

export function CommissionsTab({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const full = state.girls.length >= capacity(state);
  if (state.commissions.length === 0) return <p className="muted">No commissions right now. Check back in a few days.</p>;
  return (
    <div className="grid">
      {state.commissions.map((c) => (
        <div className="card" key={c.id}>
          <PostImage tag={c.girl.ref.tag} alt={c.girl.ref.name} />
          <div className="card-body">
            <h3>{c.girl.ref.name}</h3>
            <div className="muted small">{c.girl.ref.series}</div>
            <p><b>{c.terms.client}</b> wants her trained as a <b>{purposeLabel(c.terms.purposeId)}</b>.</p>
            <ReqList reqs={c.terms.reqs} />
            <p className="small">{c.terms.days} days · Reward <b>{c.terms.reward}g</b> · Penalty {c.terms.penalty}g</p>
            <button className="primary" disabled={full} onClick={() => dispatch({ type: 'acceptCommission', id: c.id })}>
              {full ? 'No room' : 'Accept'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- market

export function MarketTab({ state, dispatch, onScout }: { state: GameState; dispatch: Dispatch; onScout: () => void }) {
  const full = state.girls.length >= capacity(state);
  return (
    <>
      <div className="row tight">
        <p className="muted small">The market restocks every 5 days. Prefer a specific girl? A scout can find almost anyone.</p>
        <span className="spacer" />
        <button onClick={onScout}>Find a specific girl…</button>
      </div>
      <div className="grid">
        {state.market.map((m) => (
          <div className="card" key={m.girl.uid}>
            <PostImage tag={m.girl.ref.tag} alt={m.girl.ref.name} />
            <div className="card-body">
              <h3>{m.girl.ref.name}</h3>
              <div className="muted small">{m.girl.ref.series}</div>
              <Bar label="Obedience" value={m.girl.stats.obedience} />
              <Bar label="Lust" value={m.girl.stats.lust} />
              <Bar label="Affection" value={m.girl.stats.affection} />
              <button className="primary" disabled={full || state.gold < m.price} onClick={() => dispatch({ type: 'buy', uid: m.girl.uid })}>
                {full ? 'No room' : `Buy (${m.price}g)`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- buyers

export function BuyersTab({ state }: { state: GameState }) {
  if (state.buyers.length === 0) return <p className="muted">No buyers are visiting right now.</p>;
  return (
    <>
      <p className="muted small">Open a girl you own to see what each buyer would pay for her.</p>
      <div className="list">
        {state.buyers.map((b) => (
          <div className="box" key={b.id}>
            <h3>{b.name}</h3>
            <p>Looking for a <b>{purposeLabel(b.purposeId)}</b>. Budget up to <b>{Math.round(b.budget * 1.25)}g</b>. Leaves on day {b.leavesDay}.</p>
            <ReqList reqs={b.reqs} />
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- establishment

export function EstablishmentTab({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  return (
    <div className="list">
      {UPGRADES.map((u) => {
        const lvl = level(state, u.id);
        const maxed = lvl >= u.costs.length;
        const cost = u.costs[lvl];
        return (
          <div className="box upgrade" key={u.id}>
            <div>
              <h3>{u.label} {u.costs.length > 1 && <span className="muted small">level {lvl}/{u.costs.length}</span>}</h3>
              <p className="small">{u.description}</p>
            </div>
            <button className="primary" disabled={maxed || state.gold < cost} onClick={() => dispatch({ type: 'upgrade', id: u.id })}>
              {maxed ? (u.costs.length > 1 ? 'Max level' : 'Built') : `Build (${cost}g)`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
