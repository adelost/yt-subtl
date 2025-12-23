// Responsive panel placement manager

const DEBOUNCE_MS = 150;

let currentMode = null;
let resizeObserver = null;
let mutationObserver = null;
let debounceTimer = null;
let resizeHandler = null;

// Debounce helper
const debounce = (fn, ms) => {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
};

// Detect if we're on a Shorts page
export const isShorts = () => {
  return location.pathname.startsWith('/shorts/') ||
         !!document.querySelector('ytd-shorts');
};

// Detect if sidebar is visible
const isSidebarVisible = () => {
  const sidebar = document.querySelector('#secondary');
  if (!sidebar) return false;
  if (sidebar.offsetParent === null) return false;
  const rect = sidebar.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// Detect best placement mode
const detectMode = () => {
  // Shorts: always use FAB mode
  if (isShorts()) return 'fab';

  // Check for theater mode (sidebar hidden)
  const flexy = document.querySelector('ytd-watch-flexy');
  const isTheater = flexy?.hasAttribute('theater') || flexy?.getAttribute('theater') === '';
  if (isTheater) return 'inline';

  // Prefer sidebar when available
  if (isSidebarVisible()) return 'sidebar';

  // Fallback to inline
  return 'inline';
};

// Find inline insertion point
const getInlineTarget = () => {
  const primaryInner = document.querySelector('#primary #primary-inner');
  if (primaryInner) {
    const below = primaryInner.querySelector('#below');
    if (below) return { parent: primaryInner, before: below };
    return { parent: primaryInner, before: null };
  }

  const primary = document.querySelector('#primary');
  if (primary) return { parent: primary, before: null };

  return null;
};

// Find Shorts container for FAB placement
const getShortsContainer = () => {
  // Try to find the shorts container
  const shortsContainer = document.querySelector('ytd-shorts');
  if (shortsContainer) return shortsContainer;

  // Fallback to body
  return document.body;
};

// Attach panel to the appropriate location
export const attachPanel = (panel) => {
  if (!panel) return;

  const mode = detectMode();

  // Already in correct mode and attached
  if (currentMode === mode && panel.parentNode) return;

  // Remove old mode classes
  panel.classList.remove('ytxt-mode-sidebar', 'ytxt-mode-inline', 'ytxt-floating', 'ytxt-mode-fab');

  // Detach from current location
  if (panel.parentNode) {
    panel.parentNode.removeChild(panel);
  }

  currentMode = mode;

  // FAB mode for Shorts
  if (mode === 'fab') {
    const container = getShortsContainer();
    container.appendChild(panel);
    panel.classList.add('ytxt-mode-fab');
    return;
  }

  // Sidebar mode
  if (mode === 'sidebar') {
    const sidebar = document.querySelector('#secondary');
    if (sidebar) {
      sidebar.prepend(panel);
      panel.classList.add('ytxt-mode-sidebar');
      return;
    }
  }

  // Inline mode (default)
  const target = getInlineTarget();
  if (target) {
    if (target.before) {
      target.parent.insertBefore(panel, target.before);
    } else {
      target.parent.appendChild(panel);
    }
    panel.classList.add('ytxt-mode-inline');
  } else {
    // Last resort: floating
    document.body.appendChild(panel);
    panel.classList.add('ytxt-floating');
  }
};

// Start observing for layout changes
export const startObserving = (panel) => {
  if (!panel) return;

  resizeHandler = debounce(() => attachPanel(panel), DEBOUNCE_MS);

  resizeObserver = new ResizeObserver(resizeHandler);

  const flexy = document.querySelector('ytd-watch-flexy');
  if (flexy) {
    resizeObserver.observe(flexy);
  }

  // Also observe shorts container
  const shorts = document.querySelector('ytd-shorts');
  if (shorts) {
    resizeObserver.observe(shorts);
  }

  mutationObserver = new MutationObserver(resizeHandler);

  const columns = document.querySelector('#columns');
  if (columns) {
    mutationObserver.observe(columns, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'hidden', 'theater']
    });
  }

  if (flexy) {
    mutationObserver.observe(flexy, {
      attributes: true,
      attributeFilter: ['theater']
    });
  }

  window.addEventListener('resize', resizeHandler);
};

// Stop observing
export const stopObserving = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  clearTimeout(debounceTimer);
  currentMode = null;
};

// Reset placement
export const resetPlacement = () => {
  currentMode = null;
};
