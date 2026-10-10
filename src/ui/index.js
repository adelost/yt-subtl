/**
 * UI Entry - Creates and mounts panel
 */

import { createPanel, destroyPanel } from './panel.js';
import { attachPanel, startObserving, stopObserving, resetPlacement } from '../lib/placement.js';
import { updateTracks, resetState } from './state.js';
import { getCurrentVideoId } from '../lib/youtube.js';

const PANEL_ID = 'ytxt-panel';

const isYouTube = () => location.hostname === 'www.youtube.com' && !!getCurrentVideoId();

let panelElement = null;

export const initPanel = () => {
  if (!isYouTube()) return;
  if (document.getElementById(PANEL_ID)) return;

  panelElement = createPanel();
  attachPanel(panelElement);
  startObserving(panelElement);
};

/** WHAT: Turns UI listeners and invalidate video state. WHY: Keeps late requests from surviving SPA teardown. */
export const removePanel = () => {
  stopObserving();
  destroyPanel();
  resetState();

  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
};

export { updateTracks, resetPlacement };
