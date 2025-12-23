/**
 * Transcript Panel - Main UI component
 * CSP-safe vanilla JS implementation (no innerHTML)
 */

import { el, $, clear, toggle, toggleClass, setAttr, highlightedText } from '../lib/dom.js';
import { Icon } from './components/Icon.js';
import { parseTimestamp, getTimestamp, getContent, seekVideo } from '../lib/helpers.js';
import { subscribeAll } from '../lib/store.js';
import { doFetch, copy, copyFiltered, download, toggleCollapse } from './actions.js';
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
  hasTracks,
  lines,
  filteredLines,
  matchCount,
  stats,
  isShortsMode,
  setView,
  setAutoload,
  clearSearch,
  trackLabel,
} from './state.js';

// Cache DOM elements
let elements = {};
let unsubs = [];
let videoHandler = null;

// Build the panel structure
function buildPanel() {
  const container = el('div', { class: 'ytxt-panel' });

  // Header
  const header = el('div', { class: 'ytxt-header' }, [
    el('div', { class: 'ytxt-title' }, [
      Icon('transcript', 16),
      el('span', {}, 'Transcript'),
    ]),
    el('div', { class: 'ytxt-tools', id: 'ytxt-tools' }),
  ]);

  // Body
  const body = el('div', { class: 'ytxt-body', id: 'ytxt-body' }, [
    // Empty state
    el('div', { class: 'ytxt-empty', id: 'ytxt-empty' }, 'No captions available'),

    // Controls
    el('div', { class: 'ytxt-controls', id: 'ytxt-controls' }, [
      el('div', { class: 'ytxt-row' }, [
        el('select', { class: 'ytxt-select', id: 'ytxt-select' }),
        el('button', { class: 'ytxt-btn ytxt-btn-primary', id: 'ytxt-cta' }, [
          el('span', { class: 'ytxt-cta-text' }, 'Get Transcript'),
          el('span', { class: 'ytxt-spinner' }),
        ]),
      ]),
    ]),

    // Output wrapper
    el('div', { class: 'ytxt-output-wrapper', id: 'ytxt-output-wrapper' }, [
      // Text view
      el('div', { class: 'ytxt-view-text', id: 'ytxt-view-text' }, [
        el('textarea', {
          class: 'ytxt-output',
          id: 'ytxt-textarea',
          rows: '14',
          readonly: true,
        }),
        el('div', { class: 'ytxt-results', id: 'ytxt-results' }),
      ]),

      // Chips view
      el('div', { class: 'ytxt-view-chips', id: 'ytxt-view-chips' }, [
        el('div', { class: 'ytxt-chips', id: 'ytxt-chips' }),
      ]),

      // Toolbar
      el('div', { class: 'ytxt-toolbar' }, [
        el('div', { class: 'ytxt-search-wrapper' }, [
          Icon('search'),
          el('input', {
            type: 'text',
            class: 'ytxt-search',
            id: 'ytxt-search',
            placeholder: 'Search...',
          }),
          el('span', { class: 'ytxt-search-count', id: 'ytxt-search-count' }),
          el('button', {
            class: 'ytxt-btn',
            id: 'ytxt-search-clear',
            data: { icon: '' },
            title: 'Clear search',
          }, Icon('clearCircle')),
        ]),
        el('div', { class: 'ytxt-view-switcher' }, [
          el('button', {
            class: 'ytxt-view-btn',
            id: 'ytxt-view-text-btn',
            title: 'Text',
          }, Icon('text')),
          el('button', {
            class: 'ytxt-view-btn',
            id: 'ytxt-view-chips-btn',
            title: 'Timeline',
          }, Icon('chips')),
        ]),
        el('div', { class: 'ytxt-actions' }, [
          el('button', {
            class: 'ytxt-btn ytxt-btn-solid',
            id: 'ytxt-copy-filtered',
            title: 'Copy filtered',
          }, Icon('filter')),
          el('button', { class: 'ytxt-btn ytxt-btn-solid', id: 'ytxt-copy' }, [
            Icon('copy'),
            ' Copy',
          ]),
          el('button', { class: 'ytxt-btn ytxt-btn-solid', id: 'ytxt-download' }, [
            Icon('download'),
            ' Save',
          ]),
        ]),
      ]),
    ]),

    // Footer
    el('div', { class: 'ytxt-footer', id: 'ytxt-footer' }, [
      el('div', { class: 'ytxt-status', id: 'ytxt-status' }),
      el('div', { class: 'ytxt-stats', id: 'ytxt-stats' }),
    ]),
  ]);

  // Drawer wrapper for panel
  const drawer = el('div', { class: 'ytxt-drawer', id: 'ytxt-drawer' }, [header, body]);

  // FAB for shorts
  const fab = el('button', { class: 'ytxt-fab', id: 'ytxt-fab', title: 'Transcript' }, [
    Icon('transcript', 20),
  ]);

  container.appendChild(fab);
  container.appendChild(drawer);

  return container;
}

// Build header tools
function buildHeaderTools(isShorts, hasTracksVal) {
  const tools = [];

  if (hasTracksVal) {
    // Timestamps toggle
    tools.push(
      el('label', { class: 'ytxt-toggle', title: 'Include timestamps' }, [
        el('input', { type: 'checkbox', id: 'ytxt-chk-ts' }),
        Icon('clock'),
      ])
    );

    // Autoload toggle
    tools.push(
      el('label', { class: 'ytxt-toggle', title: 'Auto-load' }, [
        el('input', { type: 'checkbox', id: 'ytxt-chk-autoload' }),
        Icon('autoload'),
      ])
    );
  }

  if (!isShorts) {
    // Collapse button
    tools.push(
      el('button', { class: 'ytxt-btn ytxt-btn-icon', id: 'ytxt-collapse', title: 'Collapse' }, [
        Icon('chevronDown'),
      ])
    );
  } else {
    // Close button for shorts
    tools.push(
      el('button', { class: 'ytxt-btn ytxt-btn-icon', id: 'ytxt-close', title: 'Close' }, [
        Icon('close'),
      ])
    );
  }

  return tools;
}

// Render select options
function renderTrackOptions(tracksArr) {
  const selectEl = elements.select;
  if (!selectEl) return;

  clear(selectEl);
  tracksArr.forEach((track, i) => {
    const opt = el('option', { value: i }, trackLabel(track, i));
    selectEl.appendChild(opt);
  });
}

// Render text results (search mode)
function renderResults(linesArr, searchVal) {
  const container = elements.results;
  if (!container) return;

  clear(container);

  if (!linesArr.length) {
    container.appendChild(el('div', { class: 'ytxt-no-results' }, 'No matches'));
    return;
  }

  for (const line of linesArr) {
    const btn = el('button', { class: 'ytxt-result-line' });
    btn.appendChild(highlightedText(line, searchVal));
    btn.addEventListener('click', () => seekTo(line));
    container.appendChild(btn);
  }
}

// Render chips
function renderChips(linesArr, searchVal, activeTime) {
  const container = elements.chips;
  if (!container) return;

  clear(container);

  for (const line of linesArr) {
    const ts = getTimestamp(line);
    const content = getContent(line);
    const seconds = parseTimestamp(line);
    const isActive = seconds !== null && seconds === activeTime;

    const chip = el('button', { class: 'ytxt-chip' }, [
      el('span', { class: 'time' }, ts || ''),
      el('span', { class: 'text' }),
    ]);

    // Set active state
    setAttr(chip, 'data-active', isActive);

    // Add highlighted content
    const textSpan = chip.querySelector('.text');
    textSpan.appendChild(highlightedText(content, searchVal));

    chip.addEventListener('click', () => seekTo(line));
    container.appendChild(chip);
  }
}

// Seek video
function seekTo(line) {
  seekVideo(parseTimestamp(line));
}

// Seek from textarea click
function seekFromTextarea(e) {
  const text = e.target.value;
  const pos = e.target.selectionStart;
  const start = text.lastIndexOf('\n', pos - 1) + 1;
  const end = text.indexOf('\n', pos);
  const line = text.substring(start, end === -1 ? text.length : end);
  seekTo(line);
}

// Setup video sync for chip highlighting
function setupVideoSync() {
  const video = document.querySelector('video');
  if (!video) return;

  videoHandler = () => {
    if (view.get() !== 'chips') return;
    const currentTime = video.currentTime;
    const linesArr = filteredLines.get();

    let newActive = -1;
    for (const line of linesArr) {
      const s = parseTimestamp(line);
      if (s !== null && s <= currentTime && s > newActive) {
        newActive = s;
      }
    }

    if (newActive !== activeChipTime.get()) {
      activeChipTime.set(newActive);
      setTimeout(() => {
        const activeEl = elements.chips?.querySelector('.ytxt-chip[data-active="true"]');
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 0);
    }
  };

  video.addEventListener('timeupdate', videoHandler);
}

// Cleanup video sync
function cleanupVideoSync() {
  const video = document.querySelector('video');
  if (video && videoHandler) {
    video.removeEventListener('timeupdate', videoHandler);
    videoHandler = null;
  }
}

// Bind static events (called once)
function bindStaticEvents() {
  const { fab, cta, select, textarea, searchInput, searchClear,
          viewTextBtn, viewChipsBtn, copyBtn, copyFilteredBtn, downloadBtn } = elements;

  // FAB click (shorts)
  fab?.addEventListener('click', () => drawerOpen.set(true));

  // Get transcript button
  cta?.addEventListener('click', doFetch);

  // Track select
  select?.addEventListener('change', (e) => selectedTrack.set(Number(e.target.value)));

  // Textarea click (seek)
  textarea?.addEventListener('click', seekFromTextarea);

  // Search input
  searchInput?.addEventListener('input', (e) => search.set(e.target.value));
  searchClear?.addEventListener('click', clearSearch);

  // View switcher
  viewTextBtn?.addEventListener('click', () => setView('text'));
  viewChipsBtn?.addEventListener('click', () => setView('chips'));

  // Actions
  copyBtn?.addEventListener('click', copy);
  copyFilteredBtn?.addEventListener('click', copyFiltered);
  downloadBtn?.addEventListener('click', download);
}

// Bind header tool events (called when header is rebuilt)
function bindHeaderToolEvents() {
  const { close, collapse, chkTs, chkAutoload } = elements;

  // Close button (shorts)
  close?.addEventListener('click', () => drawerOpen.set(false));

  // Collapse button
  collapse?.addEventListener('click', toggleCollapse);

  // Toggles
  chkTs?.addEventListener('change', (e) => includeTimestamps.set(e.target.checked));
  chkAutoload?.addEventListener('change', (e) => setAutoload(e.target.checked));
}

// Subscribe to state changes
function subscribeToState() {
  // Tracks changed - rebuild options and header tools
  unsubs.push(
    tracks.subscribe((val) => {
      renderTrackOptions(val);
      rebuildHeaderTools();
    })
  );

  // Has tracks
  unsubs.push(
    hasTracks.subscribe((val) => {
      toggle(elements.empty, !val);
      toggle(elements.controls, val);
      toggle(elements.footer, val);
    })
  );

  // Loading state
  unsubs.push(
    loading.subscribe((val) => {
      setAttr(elements.cta, 'disabled', val);
      setAttr(elements.select, 'disabled', val);
      toggle(elements.spinner, val);
      toggle(elements.ctaText, !val);
    })
  );

  // Collapsed state
  unsubs.push(
    collapsed.subscribe((val) => {
      toggle(elements.body, !val || isShortsMode());
      if (elements.collapse) {
        elements.collapse.style.transform = val ? 'rotate(180deg)' : '';
        elements.collapse.title = val ? 'Expand' : 'Collapse';
      }
    })
  );

  // Drawer open (shorts)
  unsubs.push(
    drawerOpen.subscribe((val) => {
      toggleClass(elements.drawer, 'ytxt-drawer-open', val);
      toggle(elements.fab, isShortsMode() && !val);
      toggle(elements.drawer, !isShortsMode() || val);
    })
  );

  // Transcript content
  unsubs.push(
    transcript.subscribe((val) => {
      if (elements.textarea) elements.textarea.value = val;
      toggle(elements.outputWrapper, !!val);
    })
  );

  // View mode
  unsubs.push(
    view.subscribe((val) => {
      toggle(elements.viewText, val === 'text');
      toggle(elements.viewChips, val === 'chips');
      setAttr(elements.viewTextBtn, 'data-active', val === 'text');
      setAttr(elements.viewChipsBtn, 'data-active', val === 'chips');
    })
  );

  // Search value
  unsubs.push(
    search.subscribe((val) => {
      if (elements.searchInput && elements.searchInput.value !== val) {
        elements.searchInput.value = val;
      }
      toggle(elements.textarea, !val);
      toggle(elements.results, !!val);
      toggle(elements.searchClear, !!val);
      toggle(elements.searchCount, !!val);
    })
  );

  // Filtered lines - render results/chips
  unsubs.push(
    subscribeAll({ lines: filteredLines, search, activeChipTime }, ({ lines, search, activeChipTime }) => {
      if (view.get() === 'text' && search) {
        renderResults(lines, search);
      }
      if (view.get() === 'chips') {
        renderChips(lines, search, activeChipTime);
      }
    })
  );

  // Match count
  unsubs.push(
    matchCount.subscribe((val) => {
      if (elements.searchCount) elements.searchCount.textContent = val;
      toggle(elements.copyFilteredBtn, val > 0);
    })
  );

  // Status
  unsubs.push(
    subscribeAll({ status, statusType }, ({ status, statusType }) => {
      if (elements.status) {
        elements.status.textContent = status;
        setAttr(elements.status, 'data-type', statusType || null);
      }
    })
  );

  // Stats
  unsubs.push(
    stats.subscribe((val) => {
      if (elements.stats) elements.stats.textContent = val;
    })
  );

  // Include timestamps checkbox
  unsubs.push(
    includeTimestamps.subscribe((val) => {
      if (elements.chkTs) elements.chkTs.checked = val;
    })
  );

  // Autoload checkbox
  unsubs.push(
    autoload.subscribe((val) => {
      if (elements.chkAutoload) elements.chkAutoload.checked = val;
    })
  );

  // Selected track
  unsubs.push(
    selectedTrack.subscribe((val) => {
      if (elements.select) elements.select.value = val;
    })
  );
}

// Rebuild header tools based on state
function rebuildHeaderTools() {
  const tools = elements.tools;
  if (!tools) return;

  clear(tools);
  const toolEls = buildHeaderTools(isShortsMode(), hasTracks.get());
  for (const tool of toolEls) {
    tools.appendChild(tool);
  }

  // Re-cache new elements
  cacheElements(elements.container);
  bindHeaderToolEvents();

  // Sync checkbox states
  if (elements.chkTs) elements.chkTs.checked = includeTimestamps.get();
  if (elements.chkAutoload) elements.chkAutoload.checked = autoload.get();
}

// Cache element references
function cacheElements(container) {
  elements = {
    container,
    drawer: $('#ytxt-drawer', container),
    fab: $('#ytxt-fab', container),
    tools: $('#ytxt-tools', container),
    body: $('#ytxt-body', container),
    empty: $('#ytxt-empty', container),
    controls: $('#ytxt-controls', container),
    select: $('#ytxt-select', container),
    cta: $('#ytxt-cta', container),
    spinner: $('.ytxt-spinner', container),
    ctaText: $('.ytxt-cta-text', container),
    outputWrapper: $('#ytxt-output-wrapper', container),
    viewText: $('#ytxt-view-text', container),
    viewChips: $('#ytxt-view-chips', container),
    textarea: $('#ytxt-textarea', container),
    results: $('#ytxt-results', container),
    chips: $('#ytxt-chips', container),
    searchInput: $('#ytxt-search', container),
    searchCount: $('#ytxt-search-count', container),
    searchClear: $('#ytxt-search-clear', container),
    viewTextBtn: $('#ytxt-view-text-btn', container),
    viewChipsBtn: $('#ytxt-view-chips-btn', container),
    copyBtn: $('#ytxt-copy', container),
    copyFilteredBtn: $('#ytxt-copy-filtered', container),
    downloadBtn: $('#ytxt-download', container),
    status: $('#ytxt-status', container),
    stats: $('#ytxt-stats', container),
    footer: $('#ytxt-footer', container),
    collapse: $('#ytxt-collapse', container),
    // collapseIcon removed - rotation applied directly to button
    close: $('#ytxt-close', container),
    chkTs: $('#ytxt-chk-ts', container),
    chkAutoload: $('#ytxt-chk-autoload', container),
  };
}

// Create panel
export function createPanel() {
  const container = buildPanel();
  container.id = 'ytxt-panel';

  cacheElements(container);
  rebuildHeaderTools();
  bindStaticEvents();
  subscribeToState();
  setupVideoSync();

  // Initial visibility
  toggle(elements.outputWrapper, false);
  toggle(elements.results, false);
  toggle(elements.searchClear, false);
  toggle(elements.searchCount, false);
  toggle(elements.copyFilteredBtn, false);

  return container;
}

// Destroy panel
export function destroyPanel() {
  cleanupVideoSync();
  unsubs.forEach((u) => u());
  unsubs = [];
  elements = {};
}
