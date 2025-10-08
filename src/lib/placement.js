// Responsive panel placement manager

const SIDEBAR_MIN_WIDTH = 1100;
const DEBOUNCE_MS = 150;

let currentMode = null;
let resizeObserver = null;
let mutationObserver = null;
let debounceTimer = null;

// Debounce helper
const debounce = (fn, ms) => {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
};

// Detect if sidebar is visible
const isSidebarVisible = () => {
  const sidebar = document.querySelector('#secondary');
  if (!sidebar) return false;

  // Check if actually visible (not display:none, has offsetParent)
  if (sidebar.offsetParent === null) return false;

  const rect = sidebar.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// Detect best placement mode
const detectMode = () => {
  const width = window.innerWidth;

  // Check for theater mode
  const flexy = document.querySelector('ytd-watch-flexy');
  const isTheater = flexy?.hasAttribute('theater') || flexy?.getAttribute('theater') === '';

  // Theater mode: prefer Inline for full-width focus
  if (isTheater) return 'inline';

  // Check sidebar visibility and width
  if (isSidebarVisible() && width >= SIDEBAR_MIN_WIDTH) {
    return 'sidebar';
  }

  // Default to inline for everything else
  return 'inline';
};

// Find inline insertion point (below player/title, before description)
const getInlineTarget = () => {
  // Try primary-inner (contains player, title, description)
  const primaryInner = document.querySelector('#primary #primary-inner');
  if (primaryInner) {
    // Insert after title/info, before description
    const below = primaryInner.querySelector('#below');
    if (below) return { parent: primaryInner, before: below };

    // Fallback: just append to primary-inner
    return { parent: primaryInner, before: null };
  }

  // Fallback: use primary
  const primary = document.querySelector('#primary');
  if (primary) return { parent: primary, before: null };

  return null;
};

// Attach panel to the appropriate location
export const attachPanel = (panel) => {
  if (!panel) return;

  const mode = detectMode();

  // Already in correct mode and attached
  if (currentMode === mode && panel.parentNode) return;

  // Remove old mode class
  if (currentMode) {
    panel.classList.remove(`ytxt-mode-${currentMode}`);
  }

  // Detach from current location
  if (panel.parentNode) {
    panel.parentNode.removeChild(panel);
  }

  // Attach to new location
  if (mode === 'sidebar') {
    const sidebar = document.querySelector('#secondary');
    if (sidebar) {
      sidebar.prepend(panel);
      panel.classList.add('ytxt-mode-sidebar');
      currentMode = 'sidebar';
    } else {
      // Fallback to inline if sidebar disappeared
      const target = getInlineTarget();
      if (target) {
        if (target.before) {
          target.parent.insertBefore(panel, target.before);
        } else {
          target.parent.appendChild(panel);
        }
        panel.classList.add('ytxt-mode-inline');
        currentMode = 'inline';
      }
    }
  } else {
    // Inline mode
    const target = getInlineTarget();
    if (target) {
      if (target.before) {
        target.parent.insertBefore(panel, target.before);
      } else {
        target.parent.appendChild(panel);
      }
      panel.classList.add('ytxt-mode-inline');
      currentMode = 'inline';
    } else {
      // Last resort: floating
      document.body.appendChild(panel);
      panel.classList.add('ytxt-floating');
      currentMode = 'floating';
    }
  }
};

// Start observing for layout changes
export const startObserving = (panel) => {
  if (!panel) return;

  const debouncedReattach = debounce(() => attachPanel(panel), DEBOUNCE_MS);

  // Observe viewport resize
  resizeObserver = new ResizeObserver(debouncedReattach);

  // Watch the watch-flexy container for theater mode changes
  const flexy = document.querySelector('ytd-watch-flexy');
  if (flexy) {
    resizeObserver.observe(flexy);
  }

  // Watch for sidebar visibility changes
  mutationObserver = new MutationObserver(debouncedReattach);

  const columns = document.querySelector('#columns');
  if (columns) {
    mutationObserver.observe(columns, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'hidden', 'theater']
    });
  }

  // Also watch document for theater attribute changes
  if (flexy) {
    mutationObserver.observe(flexy, {
      attributes: true,
      attributeFilter: ['theater']
    });
  }

  // Watch for window resize
  window.addEventListener('resize', debouncedReattach);
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

  clearTimeout(debounceTimer);
  currentMode = null;
};

// Reset placement (useful on navigation)
export const resetPlacement = () => {
  currentMode = null;
};
