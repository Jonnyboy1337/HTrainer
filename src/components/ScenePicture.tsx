import { useEffect, useState } from 'react';
import { pickFromPool, type PoolPost, type SceneId } from '../api/pools';
import { hidePost } from '../api/rule34';
import { usePool } from './usePool';

interface Props {
  tag: string;
  scenes: readonly SceneId[];
  alt: string;
  className?: string;
}

// Remembers the chosen portrait per tag so cards don't flicker between renders.
const portraitMemo = new Map<string, PoolPost>();

/** An image from the girl's pool for the first usable scene in `scenes`. Click for another. */
export function ScenePicture({ tag, scenes, alt, className = '' }: Props) {
  const state = usePool(tag);
  const [post, setPost] = useState<PoolPost | null>(null);
  const isPortrait = scenes.length === 1 && scenes[0] === 'portrait';
  const key = `${tag}|${scenes.join(',')}`;

  useEffect(() => {
    if (state.kind !== 'ready') return;
    const memo = isPortrait ? portraitMemo.get(tag) : undefined;
    const chosen = memo ?? pickFromPool(state.pool, scenes);
    if (isPortrait && chosen) portraitMemo.set(tag, chosen);
    setPost(chosen);
    // `key` captures tag + scenes by value.
  }, [state, key]);

  const reroll = () => {
    if (state.kind !== 'ready') return;
    const next = pickFromPool(state.pool, scenes, post?.id);
    if (isPortrait && next) portraitMemo.set(tag, next);
    setPost(next);
  };

  const hide = () => {
    if (post) hidePost(post.id);
    reroll();
  };

  return (
    <div className={`post-image ${className}`}>
      {state.kind === 'loading' && <div className="post-placeholder">Loading images...</div>}
      {state.kind === 'error' && <div className="post-placeholder error">{state.message}</div>}
      {state.kind === 'ready' && !post && <div className="post-placeholder">No image found</div>}
      {state.kind === 'ready' && post && (
        <>
          <img src={post.url} alt={alt} referrerPolicy="no-referrer" onClick={reroll} title="Click for another image" />
          <button className="hide-btn" onClick={hide} title="Never show this image again">Hide</button>
        </>
      )}
    </div>
  );
}
