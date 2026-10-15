import { createContext, useContext, useState, type ReactNode } from 'react';
import { clearPools } from '../api/pools';
import { clearSearchCache } from '../api/rule34';
import { loadSettings, saveSettings, type Settings } from '../api/settings';

interface Ctx {
  settings: Settings;
  update: (s: Settings) => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);
  const update = (s: Settings) => {
    saveSettings(s);
    clearSearchCache();
    clearPools();
    setSettings(s);
  };
  return <SettingsCtx.Provider value={{ settings, update }}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}
