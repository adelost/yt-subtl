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
import { bindVideoSync } from './video-sync.js';
import { Icon } from './components/Icon.js';
import { parseTimestamp, getTimestamp, getContent, seekVideo } from '../lib/helpers.js';
import { subscribeAll } from '../lib/store.js';
import { doFetch, quickCopy, copyFiltered, download, toggleCollapse } from './actions.js';
import {
  tracks,
  selectedTrack,
  transcript,
  displayTranscript,
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
  lines,
  filteredLines,
  matchCount,
  matchLabel,
  wordCount,
  copyFeedback,
  stats,
  isShortsMode,
  setView,
  setAutoload,
  clearSearch,
  trackLabel,
} from './state.js';

let unsubs = [];
let timers = new Set();
let cleanupVideo = () => {};

const sub = (unsubscribe) => unsubs.push(unsubscribe);
const later = (fn, ms) => {
  const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
  timers.add(timer);
};

// --- Header: the always-visible slim bar ---

function buildHeader(isShorts) {
  const flash = el('span', { class: 'ytxt-flash', 'aria-live': 'polite' });

  // The main use: copy everything without opening the panel, so the action carries a label.
  const quickCopyBtn = el('button', {
    class: 'ytxt-pill-btn',
    type: 'button',
    title: 'Copy the full transcript',
    'aria-label': 'Copy transcript',
  });

  const tsToggle = el('label', { class: 'ytxt-icon-btn ytxt-toggle', title: 'Include timestamps' }, [
    el('input', { type: 'checkbox', 'aria-label': 'Include timestamps' }),
    Icon('clock', 16),
  ]);

  const autoloadToggle = el('label', { class: 'ytxt-icon-btn ytxt-toggle', title: 'Auto-load on every video' }, [
    el('input', { type: 'checkbox', 'aria-label': 'Auto-load on every video' }),
    Icon('autoload', 16),
  ]);

  const chevron = el('button', {
    class: 'ytxt-icon-btn ytxt-chevron',
    type: 'button',
    title: 'Expand',
    'aria-label': 'Expand transcript panel',
  }, Icon('chevronDown', 16));

  const closeBtn = el('button', {
    class: 'ytxt-icon-btn',
    type: 'button',
    title: 'Close',
    'aria-label': 'Close transcript panel',
  }, Icon('close', 16));

  const tools = el('div', { class: 'ytxt-tools' }, [
    tsToggle,
    autoloadToggle,
    quickCopyBtn,
    isShorts ? closeBtn : chevron,
  ]);

  const header = el('div', { class: 'ytxt-header' }, [
    el('button', { class: 'ytxt-title', type: 'button', 'aria-label': isShorts ? 'Close transcript panel' : 'Toggle transcript panel' }, [
      Icon('transcript', 16),
      el('span', { class: 'ytxt-title-text' }, 'Transcript'),
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
  sub(subscribeAll({ collapsed, hasTracks, loading }, ({ collapsed: isCollapsed, hasTracks: has, loading: busy }) => {
    const showToggles = has && (!isCollapsed || isShortsMode());
    toggle(tsToggle, showToggles);
    toggle(autoloadToggle, showToggles);
    setAttr(quickCopyBtn, 'disabled', !has || busy);
    if (chevron) {
      const action = isCollapsed ? 'Expand' : 'Collapse';
      chevron.title = action;
      chevron.setAttribute('aria-label', `${action} transcript panel`);
      chevron.setAttribute('aria-expanded', String(!isCollapsed));
    }
  }));

  sub(includeTimestamps.subscribe((val) => {
    tsInput.checked = val;
    tsToggle.title = `Include timestamps: ${val ? 'on' : 'off'}`;
  }));
  sub(autoload.subscribe((val) => {
    autoloadInput.checked = val;
    autoloadToggle.title = `Auto-load on every video: ${val ? 'on' : 'off'}`;
  }));

  sub(quickCopyState.subscribe((state) => {
    clear(quickCopyBtn);
    quickCopyBtn.appendChild(state === 'busy'
      ? el('span', { class: 'ytxt-spinner' })
      : Icon(state === 'ok' ? 'check' : 'copy', 16));
    quickCopyBtn.appendChild(el('span', {}, 'Copy'));
    setAttr(quickCopyBtn, 'data-active', state === 'ok');

    flash.textContent = copyFeedback(state, wordCount.get());
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
  const select = el('select', { class: 'ytxt-select', 'aria-label': 'Caption track' });
  const ctaText = el('span', { class: 'ytxt-cta-text' }, 'Get transcript');
  const spinner = el('span', { class: 'ytxt-spinner' });
  const cta = el('button', { class: 'ytxt-btn', type: 'button' }, [ctaText, spinner]);
  const controls = el('div', { class: 'ytxt-controls' }, [select, cta]);

  select.addEventListener('change', (e) => selectedTrack.set(Number(e.target.value)));
  cta.addEventListener('click', doFetch);

  sub(tracks.subscribe((list) => {
    clear(select);
    list.forEach((track, i) => select.appendChild(el('option', { value: i }, trackLabel(track, i))));
  }));

  sub(selectedTrack.subscribe((val) => { select.value = val; }));
  sub(transcript.subscribe((val) => setAttr(cta, 'data-primary', !val)));

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
  const index = text.slice(0, start).split('\n').length - 1;
  seekToLine(lines.get()[index] || text.substring(start, end === -1 ? text.length : end));
}

/** WHAT: Builds one clickable caption row. WHY: Keeps search results and the timeline looking and behaving alike. */
function cueRow(line, query) {
  const time = getTimestamp(line);
  const text = el('span', { class: 'ytxt-cue-text' });
  text.appendChild(highlightedText(getContent(line), query));
  const row = el('button', { class: 'ytxt-cue', type: 'button' }, [el('span', { class: 'ytxt-time' }, time || ''), text]);
  if (time) {
    row.dataset.seconds = String(parseTimestamp(line));
    row.title = `Jump to ${time}`;
  }
  row.addEventListener('click', () => seekToLine(line));
  return row;
}

function renderCues(container, linesArr, query, activeTime = -1) {
  clear(container);
  for (const line of linesArr) {
    const row = cueRow(line, query);
    setAttr(row, 'data-active', row.dataset.seconds === String(activeTime));
    container.appendChild(row);
  }
}

function buildOutput() {
  const textarea = el('textarea', {
    class: 'ytxt-output',
    readonly: true,
    'aria-label': 'Transcript text',
  });
  const results = el('div', { class: 'ytxt-results' });
  const chips = el('div', { class: 'ytxt-chips' });

  const searchInput = el('input', {
    type: 'search',
    class: 'ytxt-search',
    placeholder: 'Search transcript',
    'aria-label': 'Search transcript',
  });
  const searchClear = el('button', {
    class: 'ytxt-icon-btn', type: 'button', title: 'Clear search', 'aria-label': 'Clear search',
  }, Icon('clearCircle', 14));

  const viewTextBtn = el('button', {
    class: 'ytxt-seg-btn', type: 'button', title: 'Text view', 'aria-label': 'Text view',
  }, Icon('text', 16));
  const viewChipsBtn = el('button', {
    class: 'ytxt-seg-btn', type: 'button', title: 'Timeline view', 'aria-label': 'Timeline view',
  }, Icon('chips', 16));

  const downloadBtn = el('button', {
    class: 'ytxt-icon-btn', type: 'button', title: 'Download .txt', 'aria-label': 'Download transcript as text',
  }, Icon('download', 16));

  const matchText = el('span', { class: 'ytxt-match-label', 'aria-live': 'polite' });
  const copyMatchesBtn = el('button', {
    class: 'ytxt-text-btn', type: 'button', title: 'Copy the matching lines', 'aria-label': 'Copy search matches',
  }, [Icon('copy', 14), el('span', {}, 'Copy matches')]);
  const resultsHead = el('div', { class: 'ytxt-results-head' }, [matchText, copyMatchesBtn]);

  const wrapper = el('div', { class: 'ytxt-output-wrapper' }, [
    el('div', { class: 'ytxt-toolbar' }, [
      el('div', { class: 'ytxt-search-wrapper' }, [
        Icon('search', 14),
        searchInput,
        searchClear,
      ]),
      el('div', { class: 'ytxt-segmented', role: 'group', 'aria-label': 'View' }, [viewTextBtn, viewChipsBtn]),
      downloadBtn,
    ]),
    resultsHead,
    textarea,
    results,
    chips,
  ]);

  textarea.addEventListener('click', seekFromTextarea);
  searchInput.addEventListener('input', (e) => search.set(e.target.value));
  searchClear.addEventListener('click', clearSearch);
  viewTextBtn.addEventListener('click', () => setView('text'));
  viewChipsBtn.addEventListener('click', () => setView('chips'));
  copyMatchesBtn.addEventListener('click', copyFiltered);
  downloadBtn.addEventListener('click', download);

  sub(displayTranscript.subscribe((val) => {
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
    setAttr(viewTextBtn, 'aria-pressed', String(showText));
    setAttr(viewChipsBtn, 'aria-pressed', String(!showText));
    if (searchInput.value !== searchVal) searchInput.value = searchVal;
    toggle(searchClear, !!searchVal);
    toggle(resultsHead, !!searchVal.trim());
  }));

  sub(subscribeAll(
    { lines: filteredLines, search, view },
    ({ lines, search: searchVal, view: viewVal }) => {
      if (viewVal === 'text' && searchVal) renderCues(results, lines, searchVal);
      if (viewVal === 'chips') renderCues(chips, lines, searchVal, activeChipTime.get());
    }
  ));
  sub(activeChipTime.subscribe((time) => {
    for (const chip of chips.children) setAttr(chip, 'data-active', chip.dataset.seconds === String(time));
  }));

  sub(matchLabel.subscribe((val) => { matchText.textContent = val; }));
  sub(matchCount.subscribe((val) => toggle(copyMatchesBtn, val > 0)));

  return { wrapper, chips };
}

// --- Footer: status + stats ---

function buildFooter() {
  const statusEl = el('div', { class: 'ytxt-status', role: 'status', 'aria-live': 'polite' });
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

/** WHAT: Builds the native-style transcript UI. WHY: Keeps each subscription and timer owned by one panel lifetime. */
export function createPanel() {
  const isShorts = isShortsMode();

  const headerRefs = buildHeader(isShorts);
  const empty = el('div', { class: 'ytxt-empty' }, 'No captions available');
  const controls = buildControls();
  const output = buildOutput();
  const footer = buildFooter();

  const body = el('div', { class: 'ytxt-body' }, [empty, controls, output.wrapper, footer]);
  const drawer = el('div', { class: 'ytxt-drawer' }, [headerRefs.header, body]);
  const fab = el('button', {
    class: 'ytxt-fab', type: 'button', title: 'Transcript', 'aria-label': 'Open transcript panel',
  }, Icon('transcript', 20));
  const container = el('div', { class: 'ytxt-panel', id: 'ytxt-panel' }, [fab, drawer]);

  fab.addEventListener('click', () => drawerOpen.set(true));
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (isShortsMode()) { drawerOpen.set(false); fab.focus(); }
    else { collapsed.set(true); headerRefs.chevron.focus(); }
  });

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

  cleanupVideo = bindVideoSync(output.chips);

  return container;
}

/** WHAT: Turns panel subscriptions and timers. WHY: Keeps removed video pages from retaining UI effects. */
export function destroyPanel() {
  cleanupVideo();
  unsubs.forEach((u) => u());
  unsubs = [];
  timers.forEach(clearTimeout);
  timers.clear();
}
