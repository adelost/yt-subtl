// UI panel creation and rendering

import { state, updateTrackSelect } from './state.js';
import { handleFetch, handleCopy, handleCopyPlain, handleDownload, handleToggleCollapse } from './actions.js';
import { attachPanel, startObserving, stopObserving, resetPlacement } from '../lib/placement.js';

const PANEL_ID = 'ytxt-panel';

// Helper to safely set innerHTML with TrustedHTML support
const setTrustedHTML = (element, htmlString) => {
  if (window.trustedTypes && trustedTypes.createPolicy) {
    const policy = trustedTypes.createPolicy('ytxt-html', {
      createHTML: (string) => string
    });
    element.innerHTML = policy.createHTML(htmlString);
  } else {
    element.innerHTML = htmlString;
  }
};

export const createPanel = () => {
  if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);

  const container = document.createElement('div');
  container.id = PANEL_ID;
  container.className = 'ytxt-panel';

  const panelHTML = `
    <div class="ytxt-header">
      <div class="ytxt-title">
        <svg class="ytxt-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z"/>
        </svg>
        Transcript
      </div>
      <div class="ytxt-tools">
        <label class="ytxt-toggle" title="Include timestamps">
          <input type="checkbox" id="ytxt-timestamps" checked />
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 118 2.5a5.5 5.5 0 010 11zM8 4v4.5l3 1.5-.6 1.1L6.5 9V4H8z"/>
          </svg>
        </label>
        <label class="ytxt-toggle" title="Auto-load transcript when page loads">
          <input type="checkbox" id="ytxt-autoload" />
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z"/>
          </svg>
        </label>
        <button class="ytxt-btn ytxt-icon-btn" data-action="copy" title="Copy to clipboard (Ctrl+Shift+C)" aria-label="Copy">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H6zM2 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-1h1v1a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2h1v1H2z"/>
          </svg>
        </button>
        <button class="ytxt-btn ytxt-icon-btn" data-action="copy-plain" title="Copy without timestamps" aria-label="Copy plain text">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13 1H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2zM3 13V3h10v10H3z"/>
            <path d="M4 6h8v1H4zM4 8h8v1H4zM4 10h5v1H4z"/>
          </svg>
        </button>
        <button class="ytxt-btn ytxt-icon-btn" data-action="download" title="Download as .txt" aria-label="Download">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 12l-4-4h2.5V3h3v5H12l-4 4zm-6 1h12v2H2v-2z"/>
          </svg>
        </button>
        <button class="ytxt-btn ytxt-icon-btn ytxt-collapse-btn" data-action="toggle-collapse" title="Collapse panel" aria-label="Collapse">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10l-4-4h8l-4 4z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="ytxt-body">
      <div class="ytxt-row">
        <select id="ytxt-track" class="ytxt-select" title="Select caption track" aria-label="Caption track"></select>
        <button class="ytxt-cta" data-action="fetch">
          <span class="ytxt-btn-text">Get Transcript</span>
          <span class="ytxt-spinner" style="display: none;"></span>
        </button>
      </div>

      <div class="ytxt-output-wrapper" style="display: none;">
        <div class="ytxt-search-wrapper">
          <input type="text" id="ytxt-search" class="ytxt-search" placeholder="Search transcript..." aria-label="Search" />
          <span class="ytxt-search-count" id="ytxt-search-count"></span>
        </div>
        <textarea id="ytxt-output" class="ytxt-output" rows="16" placeholder="Select a track and click 'Get Transcript' to load subtitles..." spellcheck="false" aria-label="Transcript output"></textarea>
        <div class="ytxt-empty-state" style="display: none;">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z"/>
          </svg>
          <p>No transcript loaded yet</p>
        </div>
      </div>

      <div class="ytxt-footer">
        <div class="ytxt-footnote" id="ytxt-status"></div>
        <div class="ytxt-stats" id="ytxt-stats"></div>
        <div class="ytxt-debug">
          <details id="ytxt-debug-details">
            <summary title="Show debug info">Debug</summary>
            <pre id="ytxt-debug-pre" class="ytxt-debug-pre" aria-label="Debug info"></pre>
          </details>
        </div>
      </div>
    </div>
  `;

  setTrustedHTML(container, panelHTML);

  // Use placement manager for responsive positioning
  attachPanel(container);
  startObserving(container);

  // Cache elements
  state.elements = {
    container,
    sel: container.querySelector('#ytxt-track'),
    btnGet: container.querySelector('[data-action="fetch"]'),
    outputWrapper: container.querySelector('.ytxt-output-wrapper'),
    output: container.querySelector('#ytxt-output'),
    chkTS: container.querySelector('#ytxt-timestamps'),
    chkAutoload: container.querySelector('#ytxt-autoload'),
    searchInput: container.querySelector('#ytxt-search'),
    searchCount: container.querySelector('#ytxt-search-count'),
    status: container.querySelector('#ytxt-status'),
    stats: container.querySelector('#ytxt-stats'),
    body: container.querySelector('.ytxt-body'),
    spinner: container.querySelector('.ytxt-spinner'),
    btnText: container.querySelector('.ytxt-btn-text')
  };

  // Event delegation
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'fetch') {
      await handleFetch();
    } else if (action === 'copy') {
      await handleCopy();
    } else if (action === 'copy-plain') {
      await handleCopyPlain();
    } else if (action === 'download') {
      handleDownload();
    } else if (action === 'toggle-collapse') {
      handleToggleCollapse();
    }
  });

  // Search functionality
  if (state.elements.searchInput) {
    state.elements.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const text = state.elements.output.value;

      if (!query) {
        state.elements.searchCount.textContent = '';
        return;
      }

      // Count matches
      const lines = text.split('\n');
      const matches = lines.filter(line => line.toLowerCase().includes(query));
      state.elements.searchCount.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

      // Highlight first match by scrolling to it
      if (matches.length > 0) {
        const firstMatchIndex = text.toLowerCase().indexOf(query);
        if (firstMatchIndex !== -1) {
          state.elements.output.focus();
          state.elements.output.setSelectionRange(firstMatchIndex, firstMatchIndex + query.length);
          state.elements.output.blur();
        }
      }
    });
  }

  // Auto-load preference
  if (state.elements.chkAutoload) {
    // Load saved preference
    const savedAutoload = localStorage.getItem('ytxt-autoload');
    if (savedAutoload === 'true') {
      state.elements.chkAutoload.checked = true;
    }

    // Save preference on change
    state.elements.chkAutoload.addEventListener('change', (e) => {
      localStorage.setItem('ytxt-autoload', e.target.checked);
    });
  }

  // Clickable timestamps to seek video
  if (state.elements.output) {
    state.elements.output.addEventListener('click', (e) => {
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;

      // Find the line containing the cursor
      const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
      const lineEnd = text.indexOf('\n', cursorPos);
      const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

      // Match timestamp format [HH:MM:SS] or [MM:SS]
      const timestampMatch = line.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]/);
      if (timestampMatch) {
        const hours = parseInt(timestampMatch[1], 10);
        const minutes = parseInt(timestampMatch[2], 10);
        const seconds = parseInt(timestampMatch[3], 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        // Seek the video
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = totalSeconds;
          if (video.paused) video.play();
        }
      }
    });
  }

  updateTrackSelect(state.tracks);
  return container;
};

export const destroyPanel = () => {
  stopObserving();
  const el = document.getElementById(PANEL_ID);
  if (el?.parentNode) el.parentNode.removeChild(el);
};

// Export resetPlacement for use in navigation
export { resetPlacement };
