/**
 * UI Entry - Creates and mounts panel
 */

import { createPanel, destroyPanel } from './panel.js';
import { attachPanel, startObserving, stopObserving, resetPlacement } from '../lib/placement.js';
import { updateTracks } from './state.js';

const PANEL_ID = 'ytxt-panel';

const isYouTube = () => location.hostname.includes('youtube.com');

let panelElement = null;

export const initPanel = () => {
  if (!isYouTube()) return;
  if (document.getElementById(PANEL_ID)) return;

  panelElement = createPanel();
  attachPanel(panelElement);
  startObserving(panelElement);
};

export const removePanel = () => {
  stopObserving();
  destroyPanel();

  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
};

export { updateTracks, resetPlacement };
