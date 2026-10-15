import { useState } from 'react';
import { searchPosts } from '../api/rule34';
import { useSettings } from './SettingsContext';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState(settings);
  const [test, setTest] = useState('');

  const save = () => {
    update(draft);
    onClose();
  };

  const runTest = async () => {
    setTest('Testing...');
    try {
      const posts = await searchPosts(['tifa_lockhart', 'solo'], draft);
      setTest(`Connected. ${posts.length} images found for a test search.`);
    } catch (e) {
      setTest(`Failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel narrow" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="muted">
          The Rule34 API needs your own credentials. Log in at rule34.xxx, open <b>My Account → Options</b> and copy your
          User ID and API key. They are stored only in this browser.
        </p>
        <label>
          User ID
          <input value={draft.userId} onChange={(e) => setDraft({ ...draft, userId: e.target.value })} />
        </label>
        <label>
          API key
          <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
        </label>
        <label>
          Extra blacklist (space-separated tags)
          <input
            value={draft.extraBlacklist}
            placeholder="e.g. futanari gore"
            onChange={(e) => setDraft({ ...draft, extraBlacklist: e.target.value })}
          />
        </label>
        <p className="muted small">
          Content involving minors, photographs and real people is always filtered out and cannot be enabled.
        </p>
        {test && <p className="small">{test}</p>}
        <div className="row">
          <button onClick={runTest}>Test connection</button>
          <span className="spacer" />
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
