// Event handlers and actions

import { state, setStatus, setLoading, updateStats } from './state.js';
import { TranscriptFetcher } from '../lib/fetcher.js';

export const handleFetch = async () => {
  try {
    if (!state.elements) return;

    if (!state.tracks?.length) {
      setStatus('No captions found for this video.', 'warn');
      return;
    }

    const idx = parseInt(state.elements.sel.value, 10);
    if (Number.isNaN(idx) || !state.tracks[idx]) {
      setStatus('Please select a caption track.', 'warn');
      return;
    }

    const track = state.tracks[idx];
    setLoading(true);
    setStatus('Fetching transcript...');

    const fetcher = new TranscriptFetcher(track);
    const text = await fetcher.fetch(state.elements.chkTS.checked);

    state.elements.output.value = text;
    updateStats(text);
    setStatus(`Loaded from ${track.languageCode}${track.kind === 'asr' ? ' (auto)' : ''}`, 'ok');

    // Add success animation
    state.elements.output.classList.add('ytxt-success-flash');
    setTimeout(() => state.elements.output?.classList.remove('ytxt-success-flash'), 600);
  } catch (err) {
    console.error(err);
    // Show detailed error message in UI
    const errorMsg = err.message || 'Unknown error';
    setStatus(errorMsg, 'error');
  } finally {
    setLoading(false);
  }
};

export const handleCopy = async () => {
  try {
    if (!state.elements) return;

    const text = state.elements.output.value || '';
    if (!text) {
      setStatus('Nothing to copy', 'warn');
      return;
    }
    await navigator.clipboard.writeText(text);
    setStatus('✓ Copied to clipboard', 'ok');

    // Visual feedback
    const btn = state.elements.container.querySelector('[data-action="copy"]');
    btn?.classList.add('ytxt-success');
    setTimeout(() => btn?.classList.remove('ytxt-success'), 1000);
  } catch (err) {
    console.error(err);
    setStatus('Copy failed. Use Ctrl/Cmd+C', 'warn');
  }
};

export const handleDownload = () => {
  if (!state.elements) return;

  const text = state.elements.output.value || '';
  if (!text) {
    setStatus('Nothing to download', 'warn');
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `youtube-${state.videoId || 'transcript'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('✓ Downloaded as .txt', 'ok');
};

export const handleToggleCollapse = () => {
  state.isCollapsed = !state.isCollapsed;
  if (!state.elements) return;

  state.elements.container.classList.toggle('ytxt-collapsed', state.isCollapsed);
  const btn = state.elements.container.querySelector('[data-action="toggle-collapse"]');
  btn.title = state.isCollapsed ? 'Expand panel' : 'Collapse panel';
  btn.setAttribute('aria-label', state.isCollapsed ? 'Expand' : 'Collapse');
};
