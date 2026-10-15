import { PROFILE_TAGS } from '../game/activities';
import { TRAIT_INFO, getDef } from '../game/characters';
import { STAT_KEYS } from '../game/types';
import { Bar } from './CharacterCard';
import { PostImage } from './PostImage';

interface Props {
  ids: string[];
  gold: number;
  actionLabel: string;
  free?: boolean;
  onPick: (id: string) => void;
}

export function CharacterPicker({ ids, gold, actionLabel, free, onPick }: Props) {
  if (ids.length === 0) return <p className="muted">Nobody is available right now. The market refreshes every week.</p>;
  return (
    <div className="grid">
      {ids.map((id) => {
        const def = getDef(id);
        const trait = TRAIT_INFO[def.trait];
        const affordable = free || gold >= def.price;
        return (
          <div className="card" key={id}>
            <PostImage characterTag={def.tag} tagSets={PROFILE_TAGS} alt={def.name} />
            <div className="card-body">
              <h3>{def.name}</h3>
              <div className="muted small">{def.series} · {trait.label}: {trait.text}</div>
              {STAT_KEYS.map((k) => <Bar key={k} label={k[0].toUpperCase() + k.slice(1)} value={def.base[k]} />)}
              <button className="primary" disabled={!affordable} onClick={() => onPick(id)}>
                {actionLabel}{free ? '' : ` (${def.price}g)`}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
