import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scrollChildToTop } from '../src/lib/dom.js';

describe('scrollChildToTop', () => {
  it('places the active cue at the top of its own transcript viewport', () => {
    let request;
    const container = {
      scrollTop: 120,
      getBoundingClientRect: () => ({ top: 200 }),
      scrollTo: (options) => { request = options; },
    };
    const cue = { getBoundingClientRect: () => ({ top: 460 }) };

    assert.strictEqual(scrollChildToTop(container, cue, 6), true);
    assert.deepStrictEqual(request, { top: 374, behavior: 'smooth' });
  });

  it('does not scroll the page or throw when the cue is missing', () => {
    assert.strictEqual(scrollChildToTop({}, null), false);
  });
});
