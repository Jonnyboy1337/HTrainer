import { useEffect, useState } from 'react';
import { isTagBlocked } from '../api/contentFilter';
import { autocomplete, countPosts, tagInfo, type Suggestion } from '../api/rule34';
import { allCharacters, loadCustom, refFromTag, saveCustom } from '../game/characters';
import { capacity, type GameAction } from '../game/engine';
import type { CharacterRef, GameState } from '../game/types';
import { useSettings } from './SettingsContext';

const MIN_POSTS = 300;
/** Characters with this share of "aged_up" posts are usually minors in canon. */
const MAX_AGED_UP_RATIO = 0.01;

type Check =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; count: number; generalTag: boolean }
  | { kind: 'rejected'; reason: string };

export function scoutPrice(count: number): number {
  return Math.round(400 + Math.log10(Math.max(count, 10)) * 120);
}

export function ScoutDialog({ state, dispatch, onClose }: { state: GameState; dispatch: (a: GameAction) => void; onClose: () => void }) {
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<CharacterRef | null>(null);
  const [check, setCheck] = useState<Check>({ kind: 'idle' });
  const [adult, setAdult] = useState(false);
  const [custom, setCustom] = useState(loadCustom);

  useEffect(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '_');
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      autocomplete(q).then((s) => !cancelled && setSuggestions(s.filter((x) => !x.tag.includes('cosplay')).slice(0, 10))).catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const choose = async (tag: string) => {
    const known = allCharacters().find((c) => c.tag === tag);
    const ref = known ?? refFromTag(tag);
    setSelected(ref);
    setAdult(false);
    setSuggestions([]);
    if (isTagBlocked(tag)) return setCheck({ kind: 'rejected', reason: 'This tag is blocked by the content filter.' });
    setCheck({ kind: 'checking' });
    try {
      const info = await tagInfo(tag, settings);
      if (!info) return setCheck({ kind: 'rejected', reason: 'Tag not found.' });
      // Some characters are mistyped as general tags (0) on Rule34, so only reject
      // tags clearly typed as something else (artist, copyright, metadata).
      if (info.type !== 4 && info.type !== 0) return setCheck({ kind: 'rejected', reason: 'This is not a character tag.' });
      if (info.count < MIN_POSTS) return setCheck({ kind: 'rejected', reason: `Only ${info.count} posts. She needs at least ${MIN_POSTS} for enough scenes.` });
      const agedUp = await countPosts(`${tag} aged_up`, settings);
      if (agedUp / info.count >= MAX_AGED_UP_RATIO) {
        return setCheck({ kind: 'rejected', reason: 'This character appears to be a minor in canon (much of her art is tagged "aged_up"). Only adult characters can be trained.' });
      }
      setCheck({ kind: 'ok', count: info.count, generalTag: info.type === 0 });
    } catch (e) {
      setCheck({ kind: 'rejected', reason: (e as Error).message });
    }
  };

  const isCustom = selected ? custom.some((c) => c.tag === selected.tag) : false;
  const inRoster = selected ? allCharacters().some((c) => c.tag === selected.tag) : false;

  const addToPool = () => {
    if (!selected || inRoster) return;
    const list = [...custom, selected];
    saveCustom(list);
    setCustom(list);
  };

  const removeCustom = (tag: string) => {
    const list = custom.filter((c) => c.tag !== tag);
    saveCustom(list);
    setCustom(list);
  };

  const full = state.girls.length >= capacity(state);
  const owned = selected ? state.girls.some((g) => g.ref.tag === selected.tag) : false;
  const price = check.kind === 'ok' ? scoutPrice(check.count) : 0;
  const ready = check.kind === 'ok' && adult && selected;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel narrow" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
        <h2>Find a specific girl</h2>
        <p className="muted small">Search any character on Rule34. Your scout tracks her down for a fee. Only characters who are adults in canon are allowed.</p>
        <input autoFocus placeholder="e.g. yennefer, nami, tifa..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s) => (
              <li key={s.tag}><button className="link" onClick={() => choose(s.tag)}>{s.tag}</button> <span className="muted small">{s.count}</span></li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="box">
            <h3>{selected.name}</h3>
            <div className="muted small">{selected.series || selected.tag}</div>
            {check.kind === 'checking' && <p className="small">Checking...</p>}
            {check.kind === 'rejected' && <p className="small error">{check.reason}</p>}
            {check.kind === 'ok' && (
              <>
                <p className="small">{check.count.toLocaleString()} posts available.</p>
                {check.generalTag && <p className="small muted">Rule34 doesn't list this tag as a character, so make sure it is one, or images will be random.</p>}
                <label className="check">
                  <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
                  I confirm she is an adult (18+) in her canon.
                </label>
                <div className="row">
                  <button disabled={!ready || inRoster} onClick={addToPool}>{inRoster ? (isCustom ? 'In your pool' : 'In the roster') : 'Add to market pool'}</button>
                  <button className="primary" disabled={!ready || full || owned || state.gold < price}
                    onClick={() => { dispatch({ type: 'scout', ref: selected!, price }); if (!inRoster) addToPool(); onClose(); }}>
                    {owned ? 'Already yours' : full ? 'No room' : `Scout her (${price}g)`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {custom.length > 0 && (
          <>
            <h3>Your added characters</h3>
            <p className="muted small">These also appear at the market and in commissions.</p>
            <ul className="custom-list">
              {custom.map((c) => (
                <li key={c.tag}>{c.name} <span className="muted small">{c.tag}</span> <button className="link" onClick={() => removeCustom(c.tag)}>remove</button></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
