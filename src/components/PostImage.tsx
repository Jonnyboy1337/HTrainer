import { useEffect, useState } from 'react';
import { hidePost, hiddenPosts, searchPosts, type Post } from '../api/rule34';
import { hasCredentials } from '../api/settings';
import { useSettings } from './SettingsContext';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; post: Post | null }
  | { kind: 'error'; message: string };

/** Lightweight preview (one search) for girls you don't own yet. */
export function PostImage({ tag, alt }: { tag: string; alt: string }) {
  const { settings } = useSettings();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!hasCredentials(settings)) {
      setState({ kind: 'error', message: 'Add your API key in Settings to load images.' });
      return;
    }
    let cancelled = false;
    searchPosts([tag, 'solo', 'score:>=3'], settings)
      .then((posts) => {
        if (cancelled) return;
        const usable = posts.filter((p) => !hiddenPosts().has(p.id));
        setState({ kind: 'ready', post: usable.length ? usable[Math.floor(Math.random() * usable.length)] : null });
      })
      .catch((e: Error) => !cancelled && setState({ kind: 'error', message: e.message }));
    return () => {
      cancelled = true;
    };
  }, [tag, settings, nonce]);

  const post = state.kind === 'ready' ? state.post : null;
  return (
    <div className="post-image">
      {state.kind === 'loading' && <div className="post-placeholder">Loading...</div>}
      {state.kind === 'error' && <div className="post-placeholder error">{state.message}</div>}
      {state.kind === 'ready' && !post && <div className="post-placeholder">No image found</div>}
      {post && (
        <>
          <img src={post.imageUrl} alt={alt} referrerPolicy="no-referrer" loading="lazy" onClick={() => setNonce((n) => n + 1)} title="Click for another image" />
          <button className="hide-btn" onClick={() => { hidePost(post.id); setNonce((n) => n + 1); }} title="Never show this image again">Hide</button>
        </>
      )}
    </div>
  );
}
