/**
 * Transcript Panel - main UI component.
 *
 * Interaction model: a discreet slim bar (collapsed by default) that looks
 * like a native YouTube module. Quick-copy lives on the bar itself so the
 * transcript can be grabbed without ever opening the panel. Expanding
 * reveals track selection, search, text/timeline views, and download.
 *
 * Architecture: each build* function creates its DOM subtree and returns
 * the refs it owns — no global element cache, no re-querying by id.
 * All store subscriptions register through `sub()` and die in destroyPanel.
 */

import { el, clear, toggle, toggleClass, setAttr, highlightedText } from '../lib/dom.js';
import { Icon } from './components/Icon.js';
import { parseTimestamp, getTimestamp, getContent, seekVideo } from '../lib/helpers.js';
import { subscribeAll } from '../lib/store.js';
import { doFetch, quickCopy, copy, copyFiltered, download, toggleCollapse } from './actions.js';
import {
  tracks,
  selectedTrack,
  transcript,
  loading,
  collapsed,
  drawerOpen,
  view,
  search,
  status,
  statusType,
  includeTimestamps,
  autoload,
  activeChipTime,
  quickCopyState,
  tracksReadyTick,
  hasTracks,
  filteredLines,
  matchCount,
  stats,
  isShortsMode,
  setView,
  setAutoload,
  clearSearch,
  trackLabel,
} from './state.js';

let unsubs = [];
let timers = [];
let boundVideo = null;
let videoHandler = null;

const sub = (unsubscribe) => unsubs.push(unsubscribe);
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

// --- Header: the always-visible slim bar ---

function buildHeader(isShorts) {
  const flash = el('span', { class: 'ytxt-flash' });

  const quickCopyBtn = el('button', {
    class: 'ytxt-icon-btn',
    title: 'Copy transcript',
  }, Icon('copy', 16));

  const tsToggle = el('label', { class: 'ytxt-icon-btn ytxt-toggle', title: 'Include timestamps' }, [
    el('input', { type: 'checkbox' }),
    Icon('clock', 16),
  ]);

  const autoloadToggle = el('label', { class: 'ytxt-icon-btn ytxt-toggle', title: 'Auto-load on every video' }, [
    el('input', { type: 'checkbox' }),
    Icon('autoload', 16),
  ]);

  const chevron = el('button', {
    class: 'ytxt-icon-btn ytxt-chevron',
    title: 'Expand',
  }, Icon('chevronDown', 16));

  const closeBtn = el('button', {
    class: 'ytxt-icon-btn',
    title: 'Close',
  }, Icon('close', 16));

  const tools = el('div', { class: 'ytxt-tools' }, [
    tsToggle,
    autoloadToggle,
    quickCopyBtn,
    isShorts ? closeBtn : chevron,
  ]);

  const header = el('div', { class: 'ytxt-header' }, [
    el('div', { class: 'ytxt-title' }, [
      Icon('transcript', 16),
      el('span', {}, 'Transcript'),
      flash,
    ]),
    tools,
  ]);

  // Whole bar toggles; tool clicks must not double-trigger through the bar.
  header.addEventListener('click', () => {
    if (isShorts) drawerOpen.set(false);
    else toggleCollapse();
  });
  tools.addEventListener('click', (e) => e.stopPropagation());

  quickCopyBtn.addEventListener('click', quickCopy);
  chevron.addEventListener('click', (e) => { e.stopPropagation(); toggleCollapse(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); drawerOpen.set(false); });

  const tsInput = tsToggle.querySelector('input');
  const autoloadInput = autoloadToggle.querySelector('input');
  tsInput.addEventListener('change', (e) => includeTimestamps.set(e.target.checked));
  autoloadInput.addEventListener('change', (e) => setAutoload(e.target.checked));

  return { header, flash, quickCopyBtn, tsToggle, autoloadToggle, tsInput, autoloadInput, chevron };
}

function wireHeader(refs) {
  const { flash, quickCopyBtn, tsToggle, autoloadToggle, tsInput, autoloadInput, chevron } = refs;

  // Toggles only make sense with tracks and an open panel; the bar stays minimal.
  sub(subscribeAll({ collapsed, hasTracks }, ({ collapsed: isCollapsed, hasTracks: has }) => {
    const showToggles = has && !isCollapsed;
    toggle(tsToggle, showToggles);
    toggle(autoloadToggle, showToggles);
    setAttr(quickCopyBtn, 'disabled', !has);
    if (chevron) chevron.title = isCollapsed ? 'Expand' : 'Collapse';
  }));

  sub(includeTimestamps.subscribe((val) => { tsInput.checked = val; }));
  sub(autoload.subscribe((val) => { autoloadInput.checked = val; }));

  sub(quickCopyState.subscribe((state) => {
    clear(quickCopyBtn);
    if (state === 'busy') {
      quickCopyBtn.appendChild(el('span', { class: 'ytxt-spinner' }));
    } else {
      quickCopyBtn.appendChild(Icon(state === 'ok' ? 'check' : 'copy', 16));
    }
    setAttr(quickCopyBtn, 'data-active', state === 'ok');

    flash.textContent =
      state === 'ok' ? 'Copied' :
      state === 'error' ? (hasTracks.get() ? 'Failed to load' : 'No captions') : '';
    setAttr(flash, 'data-type', state === 'ok' ? 'ok' : null);

    if (state === 'ok' || state === 'error') {
      later(() => {
        if (quickCopyState.get() === state) quickCopyState.set('idle');
      }, 1800);
    }
  }));
}

// --- Controls: track select + fetch button ---

function buildControls() {
  const select = el('select', { class: 'ytxt-select' });
  const ctaText = el('span', { class: 'ytxt-cta-text' }, 'Get transcript');
  const spinner = el('span', { class: 'ytxt-spinner' });
  const cta = el('button', { class: 'ytxt-btn' }, [ctaText, spinner]);
  const controls = el('div', { class: 'ytxt-controls' }, [select, cta]);

  select.addEventListener('change', (e) => selectedTrack.set(Number(e.target.value)));
  cta.addEventListener('click', doFetch);

  sub(tracks.subscribe((list) => {
    clear(select);
    list.forEach((track, i) => select.appendChild(el('option', { value: i }, trackLabel(track, i))));
  }));

  sub(selectedTrack.subscribe((val) => { select.value = val; }));

  sub(loading.subscribe((val) => {
    setAttr(cta, 'disabled', val);
    setAttr(select, 'disabled', val);
    toggle(spinner, val);
    toggle(ctaText, !val);
  }));

  return controls;
}

// --- Output: textarea / search results / timeline chips + toolbar ---

function seekToLine(line) {
  seekVideo(parseTimestamp(line));
}

function seekFromTextarea(e) {
  const text = e.target.value;
  const pos = e.target.selectionStart;
  const start = text.lastIndexOf('\n', pos - 1) + 1;
  const end = text.indexOf('\n', pos);
  seekToLine(text.substring(start, end === -1 ? text.length : end));
}

function renderResults(container, linesArr, searchVal) {
  clear(container);
  if (!linesArr.length) {
    container.appendChild(el('div', { class: 'ytxt-no-results' }, 'No matches'));
    return;
  }
  for (const line of linesArr) {
    const btn = el('button', { class: 'ytxt-result-line' });
    btn.appendChild(highlightedText(line, searchVal));
    btn.addEventListener('click', () => seekToLine(line));
    container.appendChild(btn);
  }
}

function renderChips(container, linesArr, searchVal, activeTime) {
  clear(container);
  for (const line of linesArr) {
    const seconds = parseTimestamp(line);
    const textSpan = el('span', { class: 'text' });
    textSpan.appendChild(highlightedText(getContent(line), searchVal));

    const chip = el('button', { class: 'ytxt-chip' }, [
      el('span', { class: 'time' }, getTimestamp(line) || ''),
      textSpan,
    ]);
    setAttr(chip, 'data-active', seconds !== null && seconds === activeTime);
    chip.addEventListener('click', () => seekToLine(line));
    container.appendChild(chip);
  }
}

function buildOutput() {
  const textarea = el('textarea', { class: 'ytxt-output', readonly: true });
  const results = el('div', { class: 'ytxt-results' });
  const chips = el('div', { class: 'ytxt-chips' });

  const searchInput = el('input', { type: 'text', class: 'ytxt-search', placeholder: 'Search...' });
  const searchCount = el('span', { class: 'ytxt-search-count' });
  const searchClear = el('button', { class: 'ytxt-icon-btn', title: 'Clear search' }, Icon('clearCircle', 14));

  const viewTextBtn = el('button', { class: 'ytxt-icon-btn', title: 'Text view' }, Icon('text', 16));
  const viewChipsBtn = el('button', { class: 'ytxt-icon-btn', title: 'Timeline view' }, Icon('chips', 16));

  const copyFilteredBtn = el('button', { class: 'ytxt-icon-btn', title: 'Copy search matches' }, Icon('filter', 16));
  const copyBtn = el('button', { class: 'ytxt-icon-btn', title: 'Copy transcript' }, Icon('copy', 16));
  const downloadBtn = el('button', { class: 'ytxt-icon-btn', title: 'Download .txt' }, Icon('download', 16));

  const wrapper = el('div', { class: 'ytxt-output-wrapper' }, [
    el('div', { class: 'ytxt-toolbar' }, [
      el('div', { class: 'ytxt-search-wrapper' }, [
        Icon('search', 14),
        searchInput,
        searchCount,
        searchClear,
      ]),
      el('div', { class: 'ytxt-view-switcher' }, [viewTextBtn, viewChipsBtn]),
      el('div', { class: 'ytxt-actions' }, [copyFilteredBtn, copyBtn, downloadBtn]),
    ]),
    textarea,
    results,
    chips,
  ]);

  textarea.addEventListener('click', seekFromTextarea);
  searchInput.addEventListener('input', (e) => search.set(e.target.value));
  searchClear.addEventListener('click', clearSearch);
  viewTextBtn.addEventListener('click', () => setView('text'));
  viewChipsBtn.addEventListener('click', () => setView('chips'));
  copyBtn.addEventListener('click', copy);
  copyFilteredBtn.addEventListener('click', copyFiltered);
  downloadBtn.addEventListener('click', download);

  sub(transcript.subscribe((val) => {
    textarea.value = val;
    toggle(wrapper, !!val);
  }));

  sub(subscribeAll({ view, search }, ({ view: viewVal, search: searchVal }) => {
    const showText = viewVal === 'text';
    toggle(textarea, showText && !searchVal);
    toggle(results, showText && !!searchVal);
    toggle(chips, !showText);
    setAttr(viewTextBtn, 'data-active', showText);
    setAttr(viewChipsBtn, 'data-active', !showText);
    if (searchInput.value !== searchVal) searchInput.value = searchVal;
    toggle(searchClear, !!searchVal);
    toggle(searchCount, !!searchVal);
  }));

  sub(subscribeAll(
    { lines: filteredLines, search, activeChipTime, view },
    ({ lines, search: searchVal, activeChipTime: activeTime, view: viewVal }) => {
      if (viewVal === 'text' && searchVal) renderResults(results, lines, searchVal);
      if (viewVal === 'chips') renderChips(chips, lines, searchVal, activeTime);
    }
  ));

  sub(matchCount.subscribe((val) => {
    searchCount.textContent = val;
    toggle(copyFilteredBtn, val > 0);
  }));

  return { wrapper, chips };
}

// --- Footer: status + stats ---

function buildFooter() {
  const statusEl = el('div', { class: 'ytxt-status' });
  const statsEl = el('div', { class: 'ytxt-stats' });
  const footer = el('div', { class: 'ytxt-footer' }, [statusEl, statsEl]);

  sub(subscribeAll({ status, statusType }, ({ status: msg, statusType: type }) => {
    statusEl.textContent = msg;
    setAttr(statusEl, 'data-type', type || null);
  }));

  sub(stats.subscribe((val) => { statsEl.textContent = val; }));

  return footer;
}

// --- Video sync: highlight the chip matching playback position ---

function setupVideoSync(chipsContainer) {
  boundVideo = document.querySelector('video');
  if (!boundVideo) return;

  videoHandler = () => {
    if (view.get() !== 'chips') return;
    const currentTime = boundVideo.currentTime;

    let newActive = -1;
    for (const line of filteredLines.get()) {
      const s = parseTimestamp(line);
      if (s !== null && s <= currentTime && s > newActive) newActive = s;
    }

    if (newActive !== activeChipTime.get()) {
      activeChipTime.set(newActive);
      later(() => {
        const activeEl = chipsContainer.querySelector('.ytxt-chip[data-active]');
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 0);
    }
  };

  boundVideo.addEventListener('timeupdate', videoHandler);
}

function cleanupVideoSync() {
  // Remove from the element we bound to — after SPA navigation
  // document.querySelector('video') may resolve to a different element.
  if (boundVideo && videoHandler) boundVideo.removeEventListener('timeupdate', videoHandler);
  boundVideo = null;
  videoHandler = null;
}

// --- Autoload: fetch as soon as a new video's tracks arrive ---

function wireAutoload() {
  let lastTick = tracksReadyTick.get();
  sub(tracksReadyTick.subscribe((tick) => {
    if (tick === lastTick) return;
    lastTick = tick;
    if (autoload.get()) later(doFetch, 500);
  }));
}

// --- Assembly ---

export function createPanel() {
  const isShorts = isShortsMode();

  const headerRefs = buildHeader(isShorts);
  const empty = el('div', { class: 'ytxt-empty' }, 'No captions available');
  const controls = buildControls();
  const output = buildOutput();
  const footer = buildFooter();

  const body = el('div', { class: 'ytxt-body' }, [empty, controls, output.wrapper, footer]);
  const drawer = el('div', { class: 'ytxt-drawer' }, [headerRefs.header, body]);
  const fab = el('button', { class: 'ytxt-fab', title: 'Transcript' }, Icon('transcript', 20));
  const container = el('div', { class: 'ytxt-panel', id: 'ytxt-panel' }, [fab, drawer]);

  fab.addEventListener('click', () => drawerOpen.set(true));

  wireHeader(headerRefs);
  wireAutoload();

  sub(hasTracks.subscribe((has) => {
    toggle(empty, !has);
    toggle(controls, has);
    toggle(footer, has);
  }));

  sub(collapsed.subscribe((val) => {
    setAttr(container, 'data-collapsed', val && !isShortsMode());
  }));

  sub(drawerOpen.subscribe((open) => {
    toggleClass(drawer, 'ytxt-drawer-open', open);
    toggle(fab, isShortsMode() && !open);
    toggle(drawer, !isShortsMode() || open);
  }));

  setupVideoSync(output.chips);

  return container;
}

export function destroyPanel() {
  cleanupVideoSync();
  unsubs.forEach((u) => u());
  unsubs = [];
  timers.forEach(clearTimeout);
  timers = [];
}
