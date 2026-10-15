import { useEffect, useState } from 'react';
import { firstAvailable, hasScene, type Pool } from '../api/pools';
import { autocomplete, type Suggestion } from '../api/rule34';
import { ACTIONS, GROUP_LABELS, PURPOSES, SHIFTS, UPGRADES, type ActionGroup, type Shift, type TrainingAction } from '../game/content';
import {
  buyerOffer, canAfford, dealerPrice, has, imageTag, matchScore, meetsReqs, sessionsPerDay, willingness, type GameAction,
} from '../game/engine';
import type { GameState, Girl } from '../game/types';
import { ScenePicture } from './ScenePicture';
import { GirlStats, ReqList } from './Stats';
import { usePool } from './usePool';

interface Props {
  state: GameState;
  girl: Girl;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

const upgradeName = (id: string) => UPGRADES.find((u) => u.id === id)?.label ?? id;

export function actionHasImages(pool: Pool, a: TrainingAction): boolean {
  return a.strict ? hasScene(pool, a.scenes[0]) : true;
}

export function shiftHasImages(pool: Pool, s: Shift): boolean {
  return s.id === 'rest' || firstAvailable(pool, s.scenes) !== null;
}

function chanceLabel(girl: Girl, difficulty: number, skill?: TrainingAction['skill']) {
  if (difficulty === 0) return null;
  const margin = willingness(girl, skill) - difficulty;
  if (margin >= 10) return <span className="chance good">will comply</span>;
  if (margin >= -10) return <span className="chance mid">might refuse</span>;
  return <span className="chance bad">will refuse</span>;
}

export function GirlDetail({ state, girl, dispatch, onClose }: Props) {
  const tag = imageTag(girl);
  const poolState = usePool(tag);
  const pool = poolState.kind === 'ready' ? poolState.pool : null;
  const sessionsLeft = sessionsPerDay(state) - state.sessionsUsed;
  const c = girl.commission;

  const groups = (Object.keys(GROUP_LABELS) as ActionGroup[]).map((group) => {
    const actions = ACTIONS.filter((a) => a.group === group);
    const visible = pool ? actions.filter((a) => actionHasImages(pool, a)) : actions;
    return { group, visible, hidden: actions.length - visible.length };
  });
  const hiddenCount = groups.reduce((s, g) => s + g.hidden, 0);
  const shifts = SHIFTS.filter((s) => !pool || shiftHasImages(pool, s));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel wide detail" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
        <div className="detail-grid">
          <div>
            <ScenePicture tag={tag} scenes={['portrait']} alt={girl.ref.name} className="tall" />
            <LookPicker girl={girl} dispatch={dispatch} />
          </div>
          <div>
            <h2>{girl.ref.name}</h2>
            <div className="muted small">{girl.ref.series}</div>
            <GirlStats girl={girl} reqs={c?.reqs} />
            <p className="muted small">♥ likes · ✕ dislikes · ? not yet discovered</p>
          </div>
          <div className="detail-actions">
            {c && (
              <div className="box">
                <h3>Commission: {PURPOSES.find((p) => p.id === c.purposeId)?.label}</h3>
                <div className="small muted">For {c.client} · due day {c.dueDay} ({c.dueDay - state.day} days left)</div>
                <ReqList reqs={c.reqs} girl={girl} />
                <div className="small">Reward {c.reward}g · Penalty {c.penalty}g</div>
                <button className="primary" disabled={!meetsReqs(girl, c.reqs)} onClick={() => { dispatch({ type: 'deliver', uid: girl.uid }); onClose(); }}>
                  Deliver{meetsReqs(girl, c.reqs) && matchScore(girl, c.reqs) > 1 ? ' (+bonus)' : ''}
                </button>
              </div>
            )}

            <h3>Training <span className="muted small">({sessionsLeft} session{sessionsLeft === 1 ? '' : 's'} left today)</span></h3>
            {poolState.kind === 'loading' && <p className="muted small">Checking her images...</p>}
            {poolState.kind === 'error' && <p className="error small">{poolState.message}</p>}
            {groups.map(({ group, visible }) => visible.length > 0 && (
              <div key={group} className="action-group">
                <div className="group-label">{GROUP_LABELS[group]}</div>
                <div className="action-list">
                  {visible.map((a) => {
                    const locked = !has(state, a.requires);
                    const disabled = !pool || locked || sessionsLeft <= 0 || !canAfford(state, a.cost);
                    return (
                      <button key={a.id} className="action" disabled={disabled} title={a.description}
                        onClick={() => dispatch({ type: 'train', uid: girl.uid, actionId: a.id })}>
                        <span>{a.label}{a.cost ? ` (${a.cost}g)` : ''}</span>
                        {locked ? <span className="chance">needs {upgradeName(a.requires!)}</span> : chanceLabel(girl, a.difficulty, a.skill)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {pool && hiddenCount > 0 && (
              <p className="muted small">{hiddenCount} action{hiddenCount === 1 ? '' : 's'} hidden: not enough fitting images for her.</p>
            )}

            <h3>Evening shift</h3>
            <select value={girl.shiftId} onChange={(e) => dispatch({ type: 'setShift', uid: girl.uid, shiftId: e.target.value })}>
              {shifts.map((s) => (
                <option key={s.id} value={s.id} disabled={!has(state, s.requires)}>
                  {s.label}{s.requires && !has(state, s.requires) ? ` (needs ${upgradeName(s.requires)})` : ''}
                  {s.difficulty > 0 && willingness(girl, s.skill) < s.difficulty - 10 ? ' - will refuse' : ''}
                </option>
              ))}
            </select>

            {!c && (
              <>
                <h3>Sell</h3>
                {state.buyers.length === 0 && <p className="muted small">No buyers right now.</p>}
                {state.buyers.map((b) => (
                  <div key={b.id} className="buyer-row">
                    <div>
                      <b>{b.name}</b> wants a <i>{PURPOSES.find((p) => p.id === b.purposeId)?.label}</i>
                      <ReqList reqs={b.reqs} girl={girl} />
                    </div>
                    <button onClick={() => confirm(`Sell ${girl.ref.name} to ${b.name} for ${buyerOffer(girl, b)}g?`) && (dispatch({ type: 'sellToBuyer', uid: girl.uid, buyerId: b.id }), onClose())}>
                      Sell {buyerOffer(girl, b)}g
                    </button>
                  </div>
                ))}
                <button className="small-btn" onClick={() => confirm(`Sell ${girl.ref.name} to a dealer for ${dealerPrice(girl)}g?`) && (dispatch({ type: 'sellToDealer', uid: girl.uid }), onClose())}>
                  Sell to dealer: {dealerPrice(girl)}g
                </button>
                <span className="muted small"> (paid {girl.paid}g)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lets the player lock her look to a variant tag (outfit/version) for consistent images. */
function LookPicker({ girl, dispatch }: { girl: Girl; dispatch: (a: GameAction) => void }) {
  const [variants, setVariants] = useState<Suggestion[]>([]);
  useEffect(() => {
    let cancelled = false;
    autocomplete(`${girl.ref.tag}_(`)
      .then((list) => !cancelled && setVariants(list.filter((v) => v.count >= 150 && !v.tag.includes('cosplay'))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [girl.ref.tag]);

  if (variants.length === 0) return null;
  return (
    <label className="small">
      Appearance
      <select value={girl.look ?? ''} onChange={(e) => dispatch({ type: 'setLook', uid: girl.uid, look: e.target.value || null })}>
        <option value="">Any ({girl.ref.tag})</option>
        {variants.map((v) => <option key={v.tag} value={v.tag}>{v.tag.slice(girl.ref.tag.length + 1)} ({v.count})</option>)}
      </select>
    </label>
  );
}
