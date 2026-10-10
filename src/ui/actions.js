/**
 * UI Actions - Business logic for transcript panel
 */

import { fetchTranscript } from '../core/engine.js';
import { copyToClipboard, downloadText } from '../lib/helpers.js';
import {
  tracks,
  videoId,
  selectedTrack,
  transcript,
  displayTranscript,
  loading,
  collapsed,
  includeTimestamps,
  filteredLines,
  quickCopyState,
  setStatus,
  getTrackRevision,
  trackSignature,
} from './state.js';

let fetchToken = 0;

/** WHAT: Loads one current video/track request. WHY: Keeps late responses from updating a different panel generation. */
export async function doFetch({ load = fetchTranscript } = {}) {
  const $tracks = tracks.get();
  const $selectedTrack = selectedTrack.get();
  const $loading = loading.get();
  const $videoId = videoId.get();
  const revision = getTrackRevision();

  if (!$tracks.length || $loading) return;

  const track = $tracks[$selectedTrack];
  if (!track) return;

  const token = ++fetchToken;
  const requestedTrack = trackSignature(track);

  loading.set(true);
  setStatus('Fetching...');

  const isCurrentRequest = () => {
    const currentTrack = tracks.get()[selectedTrack.get()];
    return token === fetchToken &&
      getTrackRevision() === revision &&
      videoId.get() === $videoId &&
      trackSignature(currentTrack) === requestedTrack;
  };

  try {
    const result = await load(track, $videoId, true);
    if (!isCurrentRequest()) return false;
    if (!result?.trim()) throw new Error('No captions returned. Try another track.');
    transcript.set(result);
    const label = track.languageCode + (track.kind === 'asr' ? ' (auto)' : '');
    setStatus(`Loaded: ${label}`, 'ok');
    return true;
  } catch (err) {
    if (!isCurrentRequest()) return false;
    setStatus(err.message || 'Failed to load', 'error');
    return false;
  } finally {
    if (isCurrentRequest()) loading.set(false);
  }
}

/**
 * One-click copy from the collapsed bar: fetch the best track if nothing is
 * loaded yet, then copy. Never expands the panel — that is the whole point.
 * Feedback goes through quickCopyState which the header bar renders.
 * WHAT: Dispatches the current transcript without expanding the panel.
 * WHY: Keeps concurrent autoload and navigation from copying the wrong video.
 */
export async function quickCopy() {
  if (quickCopyState.get() === 'busy') return;

  quickCopyState.set('busy');
  const revision = getTrackRevision();

  if (loading.get()) await whenLoadingSettles();
  if (!transcript.get()) await doFetch();
  if (revision !== getTrackRevision()) return;

  if (!transcript.get()) {
    quickCopyState.set('error');
    return;
  }

  const ok = await copyToClipboard(displayTranscript.get());
  if (revision !== getTrackRevision()) return;
  quickCopyState.set(ok ? 'ok' : 'error');
}

// Resolves when an in-flight fetch (e.g. autoload) finishes, so quick-copy
// joins it instead of racing it.
function whenLoadingSettles() {
  if (!loading.get()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = loading.subscribe((val) => {
      if (!val) {
        unsub();
        resolve();
      }
    });
  });
}

/** WHAT: Dispatches the visible transcript projection. WHY: Keeps the timestamp preference consistent with exported bytes. */
export async function copy() {
  const $transcript = displayTranscript.get();
  if (!$transcript) {
    setStatus('Nothing to copy', 'warn');
    return;
  }

  const ok = await copyToClipboard($transcript);
  setStatus(ok ? '✓ Copied' : 'Copy failed', ok ? 'ok' : 'error');
}

/** WHAT: Dispatches search-matching captions. WHY: Keeps filtered export bound to the displayed search and timestamp preference. */
export async function copyFiltered() {
  const lines = filteredLines.get();
  if (!lines.length) {
    setStatus('No matches', 'warn');
    return;
  }

  const text = includeTimestamps.get() ? lines.join('\n') : lines.map((line) => line.replace(/^\[[^\]]+\]\s*/, '')).join('\n');
  const ok = await copyToClipboard(text);
  setStatus(ok ? `✓ Copied ${lines.length} lines` : 'Copy failed', ok ? 'ok' : 'error');
}

/** WHAT: Saves the current transcript as text. WHY: Keeps filenames and content bound to the current video. */
export function download() {
  const $transcript = displayTranscript.get();
  const $videoId = videoId.get();

  if (!$transcript) {
    setStatus('Nothing to download', 'warn');
    return;
  }

  downloadText($transcript, `transcript-${$videoId || 'video'}.txt`);
  setStatus('Download started', 'ok');
}

export function toggleCollapse() {
  collapsed.update((v) => !v);
}
