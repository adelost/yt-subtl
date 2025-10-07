// State management

import { pickBestTrack } from '../lib/youtube.js';

export const state = {
  tracks: [],
  videoId: null,
  elements: null,
  isLoading: false,
  isCollapsed: false,
  debug: { via: '', meta: null }
};

export const setStatus = (msg, kind = '') => {
  if (!state.elements) return;
  const { status } = state.elements;
  status.textContent = msg || '';
  status.className = 'ytxt-footnote ' + (kind ? `ytxt-${kind}` : '');
};

export const setLoading = (isLoading) => {
  state.isLoading = isLoading;
  if (!state.elements) return;

  const { btnGet, spinner, btnText, sel } = state.elements;
  btnGet.disabled = isLoading;
  sel.disabled = isLoading;
  spinner.style.display = isLoading ? 'inline-block' : 'none';
  btnText.style.display = isLoading ? 'none' : 'inline';
  btnGet.classList.toggle('ytxt-loading', isLoading);
};

export const updateStats = (text) => {
  if (!state.elements) return;
  const lines = text.split('\n').length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  state.elements.stats.textContent = `${lines} lines · ${words} words · ${chars.toLocaleString()} chars`;
};

export const updateTrackSelect = (tracks) => {
  if (!state.elements) return;
  const { sel, btnGet } = state.elements;

  // Clear all options using DOM methods (TrustedHTML-safe)
  while (sel.firstChild) {
    sel.removeChild(sel.firstChild);
  }

  if (!tracks?.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No captions available';
    sel.appendChild(opt);
    sel.disabled = true;
    btnGet.disabled = true;
    return;
  }

  sel.disabled = false;
  btnGet.disabled = false;
  const best = pickBestTrack(tracks);

  tracks.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = (t.name?.simpleText || t.languageCode || `Track ${i + 1}`) +
                      (t.kind === 'asr' ? ' (auto)' : '') +
                      (t.languageCode ? ` [${t.languageCode}]` : '');
    opt.selected = t === best;
    sel.appendChild(opt);
  });
};
