import { CORE_STATS, SKILLS, type Girl, type StatKey, type Stats } from '../game/types';

export const statLabel = (k: string) => k[0].toUpperCase() + k.slice(1);

export function Bar({ label, value, className = '', marker }: { label: string; value: number; className?: string; marker?: number }) {
  return (
    <div className={`bar ${className}`}>
      <span className="bar-label">{label}</span>
      <span className="bar-track">
        <span className="bar-fill" style={{ width: `${value}%` }} />
        {marker !== undefined && <span className="bar-marker" style={{ left: `${marker}%` }} title={`Required: ${marker}`} />}
      </span>
      <span className="bar-value">{Math.round(value)}</span>
    </div>
  );
}

const PREF_ICON = { 1: '♥', 0: '', [-1]: '✕' } as const;

/** Full stat block. `reqs` draws requirement markers. */
export function GirlStats({ girl, reqs }: { girl: Girl; reqs?: Partial<Stats> }) {
  return (
    <div className="stat-block">
      <Bar label="Energy" value={girl.energy} className="energy" />
      {CORE_STATS.map((k) => <Bar key={k} label={statLabel(k)} value={girl.stats[k]} className={k} marker={reqs?.[k]} />)}
      <div className="stat-sep" />
      {SKILLS.map((k) => (
        <Bar
          key={k}
          label={`${statLabel(k)} ${girl.known[k] ? PREF_ICON[girl.prefs[k]] : '?'}`}
          value={girl.stats[k]}
          className={girl.known[k] ? `pref${girl.prefs[k]}` : ''}
          marker={reqs?.[k]}
        />
      ))}
    </div>
  );
}

export function ReqList({ reqs, girl }: { reqs: Partial<Stats>; girl?: Girl }) {
  return (
    <ul className="reqs">
      {(Object.entries(reqs) as [StatKey, number][]).map(([k, v]) => {
        const ok = girl ? girl.stats[k] >= v : undefined;
        return (
          <li key={k} className={ok === undefined ? '' : ok ? 'ok' : 'missing'}>
            {statLabel(k)} {v}{girl ? ` (${Math.floor(girl.stats[k])})` : ''}
          </li>
        );
      })}
    </ul>
  );
}

export function Delta({ changes }: { changes: Partial<Record<string, number>> }) {
  const parts = Object.entries(changes).filter(([, v]) => v !== undefined && Math.abs(v) >= 0.5);
  if (parts.length === 0) return null;
  return (
    <div className="deltas">
      {parts.map(([k, v]) => (
        <span key={k} className={v! > 0 ? (k === 'fear' ? 'neutral' : 'up') : 'down'}>
          {statLabel(k)} {v! > 0 ? '+' : ''}{Math.round(v! * 10) / 10}
        </span>
      ))}
    </div>
  );
}
