// Main entry point for YouTube Transcript extension

import { extractCaptionTracks } from './lib/youtube.js';
import { state, updateTrackSelect } from './ui/state.js';
import { createPanel, destroyPanel } from './ui/panel.js';
import { handleCopy } from './ui/actions.js';

// --- Lifecycle ----------------------------------------------------------
const updateCaptions = () => {
  const data = extractCaptionTracks();
  state.tracks = data.tracks || [];
  state.videoId = data.videoId || null;

  if (state.elements) {
    updateTrackSelect(state.tracks);
  }
};

const onNavigate = () => {
  state.tracks = [];
  state.videoId = null;
  state.elements = null;

  destroyPanel();
  createPanel();
  updateCaptions();
};

// --- Init ---------------------------------------------------------------
window.addEventListener('yt-navigate-finish', onNavigate);
window.addEventListener('yt-page-data-updated', updateCaptions);

// Singleton keyboard shortcut (registered once, never removed)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    handleCopy();
  }
});

// Mutation observer to handle late sidebar rendering
const mo = new MutationObserver(() => {
  const panel = document.getElementById('ytxt-panel');
  const sidebar = document.querySelector('#secondary');
  if (panel?.classList.contains('ytxt-floating') && sidebar) {
    panel.classList.remove('ytxt-floating');
    sidebar.prepend(panel);
  }
});
mo.observe(document.documentElement, { childList: true, subtree: true });

// Initial mount
createPanel();
setTimeout(updateCaptions, 1000);
