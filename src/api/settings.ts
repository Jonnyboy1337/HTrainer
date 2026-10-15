// Per-browser settings. The API key lives only in this browser's localStorage
// and is never written into the repo or the build.

export interface Settings {
  userId: string;
  apiKey: string;
  /** User's own extra blacklist (space-separated). Adds to, never replaces, the hard filter. */
  extraBlacklist: string;
  hideAiGenerated: boolean;
}

const KEY = 'htrainer-settings';

const DEFAULTS: Settings = { userId: '', apiKey: '', extraBlacklist: '', hideAiGenerated: true };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.) - settings last for this session only.
  }
}

export function hasCredentials(s: Settings): boolean {
  return s.userId.trim() !== '' && s.apiKey.trim() !== '';
}

export function extraBlacklist(s: Settings): string[] {
  return s.extraBlacklist.split(/\s+/).filter(Boolean).map((t) => t.replace(/^-/, '').toLowerCase());
}
