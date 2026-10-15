import type { SceneId } from '../api/pools';
import type { GameAction } from '../game/engine';
import type { EveningReport, SceneResult } from '../game/types';
import { ScenePicture } from './ScenePicture';
import { Delta } from './Stats';

function SceneCard({ scene }: { scene: SceneResult }) {
  return (
    <div className={`scene ${scene.outcome}`}>
      <ScenePicture tag={scene.imageTag} scenes={scene.scenes as SceneId[]} alt={`${scene.name}: ${scene.label}`} className="scene-img" />
      <div className="scene-text">
        <h3>{scene.name} · {scene.label}</h3>
        {scene.text.map((t, i) => <p key={i}>{t}</p>)}
        <Delta changes={scene.changes} />
      </div>
    </div>
  );
}

export function SceneModal({ scene, dispatch }: { scene: SceneResult; dispatch: (a: GameAction) => void }) {
  return (
    <div className="modal-backdrop">
      <div className="panel wide">
        {/* key forces a fresh image when the scene changes (e.g. after punishing) */}
        <SceneCard key={`${scene.uid}-${scene.outcome}`} scene={scene} />
        <div className="row">
          {scene.canPunish && <button onClick={() => dispatch({ type: 'punish' })}>Punish her</button>}
          <span className="spacer" />
          <button className="primary" onClick={() => dispatch({ type: 'closeScene' })}>Continue</button>
        </div>
      </div>
    </div>
  );
}

export function ReportModal({ report, dispatch }: { report: EveningReport; dispatch: (a: GameAction) => void }) {
  const income = report.shifts.reduce((s, r) => s + (r.changes.gold ?? 0), 0);
  return (
    <div className="modal-backdrop">
      <div className="panel wide">
        <h2>Evening of day {report.day}</h2>
        {report.shifts.length === 0 && <p className="muted">No girls worked tonight.</p>}
        <div className="report-list">
          {report.shifts.map((s) => <SceneCard key={s.uid} scene={s} />)}
        </div>
        {report.events.map((e, i) => <p key={i} className="event">{e}</p>)}
        <p>Shift income <b>{income}g</b> · Upkeep <b>-{report.upkeep}g</b></p>
        <button className="primary" onClick={() => dispatch({ type: 'closeReport' })}>Next day</button>
      </div>
    </div>
  );
}
