import { useEffect, useState } from 'react';
import { loadPool, type Pool } from '../api/pools';
import { hasCredentials } from '../api/settings';
import { useSettings } from './SettingsContext';

export type PoolState =
  | { kind: 'loading' }
  | { kind: 'ready'; pool: Pool }
  | { kind: 'error'; message: string };

/** Loads (or reuses) the image pool for a tag. */
export function usePool(tag: string): PoolState {
  const { settings } = useSettings();
  const [state, setState] = useState<PoolState>({ kind: 'loading' });

  useEffect(() => {
    if (!hasCredentials(settings)) {
      setState({ kind: 'error', message: 'Add your API key in Settings to load images.' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    loadPool(tag, settings)
      .then((pool) => !cancelled && setState({ kind: 'ready', pool }))
      .catch((e: Error) => !cancelled && setState({ kind: 'error', message: e.message }));
    return () => {
      cancelled = true;
    };
  }, [tag, settings]);

  return state;
}
