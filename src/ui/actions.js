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
  loading,
  collapsed,
  includeTimestamps,
  filteredLines,
  setStatus,
  getTrackRevision,
  trackSignature,
} from './state.js';

let fetchToken = 0;

export async function doFetch() {
  const $tracks = tracks.get();
  const $selectedTrack = selectedTrack.get();
  const $loading = loading.get();
  const $videoId = videoId.get();
  const $includeTimestamps = includeTimestamps.get();
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
    const result = await fetchTranscript(track, $videoId, $includeTimestamps);
    if (!isCurrentRequest()) return;
    transcript.set(result);
    collapsed.set(false);
    const label = track.languageCode + (track.kind === 'asr' ? ' (auto)' : '');
    setStatus(`Loaded: ${label}`, 'ok');
  } catch (err) {
    if (!isCurrentRequest()) return;
    setStatus(err.message || 'Failed to load', 'error');
  } finally {
    if (isCurrentRequest()) loading.set(false);
  }
}

export async function copy() {
  const $transcript = transcript.get();
  if (!$transcript) {
    setStatus('Nothing to copy', 'warn');
    return;
  }

  const ok = await copyToClipboard($transcript);
  setStatus(ok ? '✓ Copied' : 'Copy failed', ok ? 'ok' : 'error');
}

export async function copyFiltered() {
  const lines = filteredLines.get();
  if (!lines.length) {
    setStatus('No matches', 'warn');
    return;
  }

  const ok = await copyToClipboard(lines.join('\n'));
  setStatus(ok ? `✓ Copied ${lines.length} lines` : 'Copy failed', ok ? 'ok' : 'error');
}

export function download() {
  const $transcript = transcript.get();
  const $videoId = videoId.get();

  if (!$transcript) {
    setStatus('Nothing to download', 'warn');
    return;
  }

  downloadText($transcript, `transcript-${$videoId || 'video'}.txt`);
  setStatus('✓ Downloaded', 'ok');
}

export function toggleCollapse() {
  collapsed.update((v) => !v);
}
