/**
 * UI State - Reactive stores for transcript panel
 */

import { writable, persisted, derived } from '../lib/store.js';
import { pickBestTrack } from '../lib/youtube.js';
import { isShorts } from '../lib/placement.js';

// Core state
export const tracks = writable([]);
export const videoId = writable(null);
export const selectedTrack = writable(0);
export const transcript = writable('');
export const loading = writable(false);
export const collapsed = writable(false);
export const drawerOpen = writable(false);
export const search = writable('');
export const status = writable('');
export const statusType = writable('');
export const activeChipTime = writable(-1);

// Persisted state
export const view = persisted('ytxt-view', 'text');
export const includeTimestamps = persisted('ytxt-timestamps', true);
export const autoload = persisted('ytxt-autoload', false);

// Derived state
export const hasTracks = derived(tracks, (t) => t.length > 0);

export const lines = derived(transcript, (t) =>
  t ? t.split('\n').filter((l) => l.trim()) : []
);

export const filteredLines = derived([lines, search], ([l, s]) =>
  s ? l.filter((line) => line.toLowerCase().includes(s.toLowerCase())) : l
);

export const matchCount = derived([search, filteredLines], ([s, f]) =>
  s ? f.length : 0
);

export const stats = derived([transcript, lines], ([t, l]) =>
  t ? `${l.length} lines · ${t.split(/\s+/).filter(Boolean).length} words` : ''
);

// Helpers
export const isShortsMode = () => isShorts();

export function setStatus(msg, type = '') {
  status.set(msg);
  statusType.set(type);
}

export function selectBestTrack() {
  const $tracks = tracks.get();
  if (!$tracks.length) return;

  const best = pickBestTrack($tracks);
  const idx = $tracks.indexOf(best);
  if (idx >= 0) selectedTrack.set(idx);
}

export function trackLabel(track, i) {
  const name = track.name?.simpleText || track.languageCode || `Track ${i + 1}`;
  return track.kind === 'asr' ? `${name} (auto)` : name;
}

export function clearSearch() {
  search.set('');
}

export function setView(v) {
  view.set(v);
}

export function setAutoload(value) {
  autoload.set(value);
}

// Update function for external use (called from content-script)
export function updateTracks(newTracks, newVideoId) {
  tracks.set(newTracks || []);
  videoId.set(newVideoId);
  transcript.set('');
  status.set('');
  statusType.set('');
  activeChipTime.set(-1);
  search.set('');

  if (newTracks?.length) {
    selectBestTrack();

    if (autoload.get()) {
      // Import dynamically to avoid circular dependency
      import('./actions.js').then(({ doFetch }) => {
        setTimeout(() => doFetch(), 500);
      });
    }
  }
}

// Reset state
export function resetState() {
  tracks.set([]);
  videoId.set(null);
  selectedTrack.set(0);
  transcript.set('');
  loading.set(false);
  collapsed.set(false);
  drawerOpen.set(false);
  search.set('');
  status.set('');
  statusType.set('');
  activeChipTime.set(-1);
}
