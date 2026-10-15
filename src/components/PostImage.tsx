import { useCallback, useEffect, useState } from 'react';
import { hidePost, pickPost, type Post } from '../api/rule34';
import { hasCredentials } from '../api/settings';
import { useSettings } from './SettingsContext';

interface Props {
  characterTag: string;
  /** Tag sets tried in order; characterTag is prepended to each. */
  tagSets: string[][];
  alt: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; post: Post }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export function PostImage({ characterTag, tagSets, alt }: Props) {
  const { settings } = useSettings();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(tagSets);

  useEffect(() => {
    if (!hasCredentials(settings)) {
      setState({ kind: 'error', message: 'Add your API key in Settings to load images.' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    const sets = tagSets.map((t) => [characterTag, ...t]);
    pickPost(sets, settings)
      .then((post) => !cancelled && setState(post ? { kind: 'ready', post } : { kind: 'empty' }))
      .catch((err: Error) => !cancelled && setState({ kind: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
    // tagSets is compared by value via `key`.
  }, [characterTag, key, settings, nonce]);

  const reroll = useCallback(() => setNonce((n) => n + 1), []);
  const hide = useCallback(() => {
    if (state.kind === 'ready') hidePost(state.post.id);
    reroll();
  }, [state, reroll]);

  return (
    <div className="post-image">
      {state.kind === 'loading' && <div className="post-placeholder">Loading...</div>}
      {state.kind === 'empty' && <div className="post-placeholder">No image found</div>}
      {state.kind === 'error' && <div className="post-placeholder error">{state.message}</div>}
      {state.kind === 'ready' && (
        <>
          <img src={state.post.imageUrl} alt={alt} referrerPolicy="no-referrer" loading="lazy" onClick={reroll} title="Click for another image" />
          <button className="hide-btn" onClick={hide} title="Never show this image again">
            Hide
          </button>
        </>
      )}
    </div>
  );
}
