import { ACTIVITIES, PROFILE_TAGS, getActivity } from '../game/activities';
import { TRAIT_INFO, getDef } from '../game/characters';
import { sellPrice, willingness } from '../game/engine';
import { STAT_KEYS, type Character } from '../game/types';
import { PostImage } from './PostImage';

interface Props {
  character: Character;
  canSell: boolean;
  onActivity: (activityId: string) => void;
  onSell: () => void;
}

const GROUPS = [
  { kind: 'rest', label: 'Rest' },
  { kind: 'train', label: 'Training' },
  { kind: 'job', label: 'Jobs' },
] as const;

export function Bar({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className={`bar ${className}`}>
      <span className="bar-label">{label}</span>
      <span className="bar-track"><span className="bar-fill" style={{ width: `${value}%` }} /></span>
      <span className="bar-value">{Math.round(value)}</span>
    </div>
  );
}

export function CharacterCard({ character: c, canSell, onActivity, onSell }: Props) {
  const def = getDef(c.defId);
  const act = getActivity(c.activityId);
  const will = willingness(c);
  const trait = TRAIT_INFO[def.trait];

  return (
    <div className="card">
      <PostImage characterTag={def.tag} tagSets={PROFILE_TAGS} alt={def.name} />
      <div className="card-body">
        <h3>{def.name}</h3>
        <div className="muted small">{def.series} · <span title={trait.text}>{trait.label}</span></div>
        <Bar label="Energy" value={c.energy} className="energy" />
        <Bar label="Mood" value={c.mood} className="mood" />
        {STAT_KEYS.map((k) => <Bar key={k} label={k[0].toUpperCase() + k.slice(1)} value={c.stats[k]} />)}

        <label className="small">
          Tomorrow's activity
          <select value={c.activityId} onChange={(e) => onActivity(e.target.value)}>
            {GROUPS.map((g) => (
              <optgroup key={g.kind} label={g.label}>
                {ACTIVITIES.filter((a) => a.kind === g.kind).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}{a.cost ? ` (${a.cost}g)` : ''}{a.difficulty > will ? ' - likely refuses' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <p className="muted small">{act.description}</p>
        {canSell && (
          <button className="small-btn" onClick={onSell}>Sell for {sellPrice(c)}g</button>
        )}
      </div>
    </div>
  );
}
