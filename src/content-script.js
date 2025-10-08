// Main entry point for YouTube Transcript extension

import { extractCaptionTracks } from './lib/youtube.js';
import { injectObserver, onHarvestEvent } from './lib/harvest.js';
import { state, updateTrackSelect } from './ui/state.js';
import { createPanel, destroyPanel, resetPlacement } from './ui/panel.js';
import { handleCopy, handleFetch } from './ui/actions.js';

// --- Lifecycle ----------------------------------------------------------
const updateCaptions = () => {
  const data = extractCaptionTracks();
  state.tracks = data.tracks || [];
  state.videoId = data.videoId || null;

  if (state.elements) {
    updateTrackSelect(state.tracks);

    // Auto-load if enabled
    const autoloadEnabled = localStorage.getItem('ytxt-autoload') === 'true';
    if (autoloadEnabled && state.tracks?.length > 0 && !state.elements.output.value) {
      // Small delay to ensure UI is ready
      setTimeout(() => handleFetch(), 500);
    }
  }
};

const onNavigate = () => {
  state.tracks = [];
  state.videoId = null;
  state.elements = null;

  destroyPanel();
  resetPlacement();
  createPanel();
  updateCaptions();
};

// --- Init ---------------------------------------------------------------
// Install page-context observer and bridge harvested templates
injectObserver();
window.addEventListener('ytxt:transcript-template', (e) => {
  try { onHarvestEvent(e.detail); } catch {}
});
window.addEventListener('yt-navigate-finish', onNavigate);
window.addEventListener('yt-page-data-updated', updateCaptions);

// Singleton keyboard shortcut (registered once, never removed)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    handleCopy();
  }
});

// PlacementManager now handles layout changes automatically via its observers

// Initial mount
createPanel();
setTimeout(updateCaptions, 1000);
