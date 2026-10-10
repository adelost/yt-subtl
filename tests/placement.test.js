import { it } from 'node:test';
import assert from 'node:assert/strict';
import { attachPanel, resetPlacement } from '../src/lib/placement.js';

it('reattaches to the current sidebar when YouTube replaces the old parent', () => {
  resetPlacement();
  let attached = 0;
  const parent = { prepend(panel) { attached++; panel.parentNode = this; panel.isConnected = true; }, removeChild() {} };
  const originalDocument = globalThis.document, originalLocation = globalThis.location;
  globalThis.location = { pathname: '/watch' };
  globalThis.document = { querySelector(selector) {
    return selector === '#secondary' ? { ...parent, offsetParent: {}, getBoundingClientRect: () => ({ width: 350, height: 800 }) } : null;
  } };
  const panel = { parentNode: null, isConnected: false, classList: { add() {}, remove() {} } };
  try {
    attachPanel(panel);
    panel.isConnected = false;
    attachPanel(panel);
    assert.equal(attached, 2);
  } finally {
    globalThis.document = originalDocument;
    globalThis.location = originalLocation;
    resetPlacement();
  }
});
