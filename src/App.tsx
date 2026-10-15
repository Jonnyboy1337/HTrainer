import { useEffect, useReducer, useState } from 'react';
import { hasCredentials } from './api/settings';
import { AGE_KEY, AgeGate } from './components/AgeGate';
import { GirlDetail } from './components/GirlDetail';
import { ReportModal, SceneModal } from './components/SceneModal';
import { ScoutDialog } from './components/ScoutDialog';
import { useSettings } from './components/SettingsContext';
import { SettingsPanel } from './components/SettingsPanel';
import { BuyersTab, CommissionsTab, EstablishmentTab, GirlsTab, MarketTab } from './components/Tabs';
import { capacity, loadGame, newGame, reducer, saveGame, sessionsPerDay } from './game/engine';

type Tab = 'girls' | 'commissions' | 'market' | 'buyers' | 'establishment';

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
  const [tab, setTab] = useState<Tab>('girls');
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScout, setShowScout] = useState(false);
  const { settings } = useSettings();

  useEffect(() => saveGame(state), [state]);

  if (!adult) return <AgeGate onConfirm={() => setAdult(true)} />;

  const openGirl = state.girls.find((g) => g.uid === openUid) ?? null;
  const sessionsLeft = sessionsPerDay(state) - state.sessionsUsed;

  const tabs: [Tab, string][] = [
    ['girls', `Girls (${state.girls.length}/${capacity(state)})`],
    ['commissions', `Commissions (${state.commissions.length})`],
    ['market', 'Market'],
    ['buyers', `Buyers (${state.buyers.length})`],
    ['establishment', 'Establishment'],
  ];

  return (
    <div className="app">
      <header>
        <h1>HTrainer</h1>
        <div className="stats">
          <span>Day <b>{state.day}</b></span>
          <span className={state.gold < 0 ? 'neg' : ''}>Gold <b>{state.gold}</b></span>
          <span>Reputation <b>{Math.round(state.reputation)}</b></span>
          <span>Sessions <b>{sessionsLeft}</b>/{sessionsPerDay(state)}</span>
        </div>
        <span className="spacer" />
        <button onClick={() => setShowSettings(true)}>Settings</button>
        <button onClick={() => confirm('Start a new game? Your current progress will be lost.') && dispatch({ type: 'new' })}>New game</button>
      </header>

      {!hasCredentials(settings) && (
        <div className="banner">
          Images need a Rule34 API key. <button className="link" onClick={() => setShowSettings(true)}>Open settings</button>
        </div>
      )}

      <main>
        {state.status === 'lost' ? (
          <div className="panel narrow">
            <h2>Bankrupt</h2>
            <p>You stayed in debt for too long. The creditors seized your establishment and everything in it.</p>
            <button className="primary" onClick={() => dispatch({ type: 'new' })}>Start over</button>
          </div>
        ) : (
          <>
            <nav className="tabs">
              {tabs.map(([id, label]) => (
                <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
              ))}
              <span className="spacer" />
              <button className="primary" onClick={() => dispatch({ type: 'endDay' })}>End day →</button>
            </nav>
            {tab === 'girls' && <GirlsTab state={state} onOpen={(g) => setOpenUid(g.uid)} />}
            {tab === 'commissions' && <CommissionsTab state={state} dispatch={dispatch} />}
            {tab === 'market' && <MarketTab state={state} dispatch={dispatch} onScout={() => setShowScout(true)} />}
            {tab === 'buyers' && <BuyersTab state={state} />}
            {tab === 'establishment' && <EstablishmentTab state={state} dispatch={dispatch} />}
          </>
        )}
      </main>

      {openGirl && !state.scene && <GirlDetail state={state} girl={openGirl} dispatch={dispatch} onClose={() => setOpenUid(null)} />}
      {state.scene && <SceneModal scene={state.scene} dispatch={dispatch} />}
      {state.report && <ReportModal report={state.report} dispatch={dispatch} />}
      {showScout && <ScoutDialog state={state} dispatch={dispatch} onClose={() => setShowScout(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
