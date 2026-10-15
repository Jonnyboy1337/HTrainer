import { getActivity } from '../game/activities';
import { getDef } from '../game/characters';
import type { DayReport as Report } from '../game/types';
import { PostImage } from './PostImage';

export function DayReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const income = report.entries.reduce((s, e) => s + e.gold, 0);
  return (
    <div className="modal-backdrop">
      <div className="panel wide">
        <h2>End of day {report.day}</h2>
        <div className="report-list">
          {report.entries.map((e) => {
            const def = getDef(e.defId);
            const act = getActivity(e.activityId);
            const tagSets = e.outcome === 'refused' ? [['angry'], ['solo']] : act.imageTags;
            return (
              <div className={`report-entry ${e.outcome}`} key={e.defId}>
                <PostImage characterTag={def.tag} tagSets={tagSets} alt={`${def.name} - ${act.label}`} />
                <div>
                  <h3>{def.name} · {act.label}</h3>
                  <p>{e.text}</p>
                  <p className="small">
                    {Object.entries(e.changes)
                      .filter(([, v]) => v && v > 0.05)
                      .map(([k, v]) => `${k} +${v!.toFixed(1)}`)
                      .join(', ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {report.events.map((ev) => <p key={ev} className="event">{ev}</p>)}
        <p>
          Net from activities: <b>{income}g</b> · Upkeep: <b>-{report.upkeep}g</b>
        </p>
        <button className="primary" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}
