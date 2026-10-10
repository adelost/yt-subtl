/**
 * Content Script - Entry point
 * Minimal orchestration, UI logic in ui/
 */

import { extractCaptionTracks, getCurrentVideoId } from './lib/youtube.js';
import { injectObserver, onHarvestEvent } from './lib/harvest.js';
import { initPanel, removePanel, updateTracks, resetPlacement } from './ui/index.js';

// Only run on YouTube
if (location.hostname !== 'www.youtube.com') {
  throw new Error('Not YouTube');
}

// Check if ad is playing
const isAdPlaying = () => {
  const player = document.querySelector('.html5-video-player');
  return player?.classList.contains('ad-showing') || false;
};

// Update captions from YouTube data
const updateCaptions = () => {
  if (!getCurrentVideoId()) return;
  const { tracks, videoId } = extractCaptionTracks();
  updateTracks(tracks, videoId);
};

// Handle navigation
let refreshTimer;
let navigation = 0;
const onNavigate = () => {
  clearTimeout(refreshTimer);
  const token = ++navigation;
  adObserver.disconnect();
  removePanel();
  resetPlacement();
  if (!getCurrentVideoId()) return;
  initPanel();
  let attempts = 0;
  const refresh = () => {
    if (token !== navigation) return;
    updateCaptions();
    startAdObserver();
    if (++attempts < 8) refreshTimer = setTimeout(refresh, 750);
  };
  refresh();
};

// Watch for ads
let wasAdPlaying = false;
const adObserver = new MutationObserver(() => {
  const adNow = isAdPlaying();
  if (wasAdPlaying && !adNow) {
    setTimeout(updateCaptions, 1500);
  }
  wasAdPlaying = adNow;
});

const startAdObserver = () => {
  adObserver.disconnect();
  const player = document.querySelector('.html5-video-player');
  if (player) {
    adObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
    wasAdPlaying = isAdPlaying();
  }
};

// Wait for DOM to be ready before initializing
const init = () => {
  injectObserver();
  window.addEventListener('ytxt:transcript-template', (e) => {
    try { onHarvestEvent(e.detail); } catch {}
  });
  window.addEventListener('yt-navigate-finish', onNavigate);
  window.addEventListener('yt-page-data-updated', updateCaptions);

  onNavigate();
};

// Run when DOM is ready (handles document_start timing)
if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
