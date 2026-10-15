import { useEffect, useReducer, useState } from 'react';
import { hasCredentials } from './api/settings';
import { AGE_KEY, AgeGate } from './components/AgeGate';
import { CharacterCard } from './components/CharacterCard';
import { DayReport } from './components/DayReport';
import { CharacterPicker } from './components/Market';
import { useSettings } from './components/SettingsContext';
import { SettingsPanel } from './components/SettingsPanel';
import { DEADLINE, UPKEEP, loadGame, newGame, reducer, saveGame } from './game/engine';

type Tab = 'house' | 'market';

function ageConfirmed(): boolean {
  try {
    return localStorage.getItem(AGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [adult, setAdult] = useState(ageConfirmed);
  const [state, dispatch] = useReducer(reducer, undefined, () => loadGame() ?? newGame());
  const [tab, setTab] = useState<Tab>('house');
  const [showSettings, setShowSettings] = useState(false);
  const { settings } = useSettings();

  useEffect(() => saveGame(state), [state]);

  if (!adult) return <AgeGate onConfirm={() => setAdult(true)} />;

  const newGameConfirm = () => {
    if (confirm('Start a new game? Your current progress will be lost.')) dispatch({ type: 'new' });
  };

  const payDebt = () => {
    const input = prompt(`Pay how much? (You have ${state.gold}g, debt ${state.debt}g)`, String(Math.min(state.gold, state.debt)));
    const amount = Number(input);
    if (Number.isFinite(amount) && amount > 0) dispatch({ type: 'payDebt', amount: Math.floor(amount) });
  };

  return (
    <div className="app">
      <header>
        <h1>HTrainer</h1>
        {state.status !== 'choosing' && (
          <div className="stats">
            <span>Day <b>{Math.min(state.day, DEADLINE)}</b>/{DEADLINE}</span>
            <span className={state.gold < 0 ? 'neg' : ''}>Gold <b>{state.gold}</b></span>
            <span>Debt <b>{state.debt}</b></span>
            <span>Reputation <b>{Math.round(state.reputation)}</b></span>
          </div>
        )}
        <span className="spacer" />
        <button onClick={() => setShowSettings(true)}>Settings</button>
        <button onClick={newGameConfirm}>New game</button>
      </header>

      {!hasCredentials(settings) && (
        <div className="banner">
          Images need a Rule34 API key. <button className="link" onClick={() => setShowSettings(true)}>Open settings</button>
        </div>
      )}

      <main>
        {state.status === 'choosing' && (
          <>
            <h2>Choose your first trainee</h2>
            <p className="muted">
              You inherited a run-down house of pleasure and a debt of {state.debt.toLocaleString()} gold, due in {DEADLINE} days.
              Train your girls, put them to work, and pay it off.
            </p>
            <CharacterPicker ids={state.starterChoices} gold={state.gold} actionLabel="Choose" free onPick={(id) => dispatch({ type: 'chooseStarter', defId: id })} />
          </>
        )}

        {state.status === 'playing' && (
          <>
            <nav className="tabs">
              <button className={tab === 'house' ? 'active' : ''} onClick={() => setTab('house')}>Your house ({state.owned.length})</button>
              <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}>Market ({state.market.length})</button>
              <span className="spacer" />
              <button onClick={payDebt} disabled={state.gold <= 0}>Pay debt</button>
              <button className="primary" onClick={() => dispatch({ type: 'endDay' })}>End day →</button>
            </nav>
            {tab === 'house' && (
              <>
                <p className="muted small">Daily upkeep: {state.owned.length * UPKEEP}g. Pick an activity for each girl, then end the day.</p>
                <div className="grid">
                  {state.owned.map((c) => (
                    <CharacterCard
                      key={c.defId}
                      character={c}
                      canSell={state.owned.length > 1}
                      onActivity={(activityId) => dispatch({ type: 'setActivity', defId: c.defId, activityId })}
                      onSell={() => confirm('Sell her?') && dispatch({ type: 'sell', defId: c.defId })}
                    />
                  ))}
                </div>
              </>
            )}
            {tab === 'market' && (
              <CharacterPicker ids={state.market} gold={state.gold} actionLabel="Buy" onPick={(id) => dispatch({ type: 'buy', defId: id })} />
            )}
          </>
        )}

        {(state.status === 'won' || state.status === 'lost') && (
          <div className="panel narrow">
            <h2>{state.status === 'won' ? 'Debt paid off!' : 'Game over'}</h2>
            <p>
              {state.status === 'won'
                ? `You cleared your debt on day ${state.day}. The house is yours.`
                : state.daysInRed >= 3
                  ? 'You stayed broke for too long and the creditors seized the house.'
                  : `Day ${DEADLINE} came and went with ${state.debt}g still owed. The creditors seized the house.`}
            </p>
            <button className="primary" onClick={() => dispatch({ type: 'new' })}>Play again</button>
          </div>
        )}
      </main>

      {state.report && <DayReport report={state.report} onClose={() => dispatch({ type: 'dismissReport' })} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
