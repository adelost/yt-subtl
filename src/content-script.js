/**
 * Content Script - Entry point
 * Minimal orchestration, UI logic in ui/
 */

import { extractCaptionTracks } from './lib/youtube.js';
import { injectObserver, onHarvestEvent } from './lib/harvest.js';
import { initPanel, removePanel, updateTracks, resetPlacement } from './ui/index.js';

// Only run on YouTube
if (!location.hostname.includes('youtube.com')) {
  throw new Error('Not YouTube');
}

// Check if ad is playing
const isAdPlaying = () => {
  const player = document.querySelector('.html5-video-player');
  return player?.classList.contains('ad-showing') || false;
};

// Update captions from YouTube data
const updateCaptions = () => {
  const { tracks, videoId } = extractCaptionTracks();
  updateTracks(tracks, videoId);
};

// Handle navigation
const onNavigate = () => {
  removePanel();
  resetPlacement();
  initPanel();
  updateCaptions();
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

  initPanel();
  setTimeout(() => {
    updateCaptions();
    startAdObserver();
  }, 1000);
};

// Run when DOM is ready (handles document_start timing)
if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
