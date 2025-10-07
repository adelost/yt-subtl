import { reportStatus } from '../../shared/status-bus.js';

const waitForEl = (sel, timeout = 2000) => new Promise((resolve) => {
  const el = document.querySelector(sel);
  if (el) return resolve(el);
  const mo = new MutationObserver(() => {
    const e = document.querySelector(sel);
    if (e) { mo.disconnect(); resolve(e); }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => { try { mo.disconnect(); } catch {} resolve(null); }, timeout);
});

const openTranscriptPanel = async () => {
  // Try built-in menu path: find menu button → click "Show transcript"
  try {
    const menu = document.querySelector('ytd-menu-renderer #button') || document.querySelector('#button[aria-label*="More actions" i]');
    if (menu) {
      menu.click();
      // Wait for popup items
      const popup = await waitForEl('ytd-menu-popup-renderer', 1500);
      if (popup) {
        const item = Array.from(popup.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item'))
          .find(n => /transcript/i.test(n.textContent || ''));
        if (item) {
          item.click();
          // Wait for transcript panel to appear
          await waitForEl('ytd-transcript-renderer,ytd-transcript-panel-renderer', 2000);
        }
      }
    }
  } catch {}
};

const scrapeTranscript = (withTS) => {
  try {
    // Prefer the transcript panel renderer when available
    const panel = document.querySelector('ytd-transcript-renderer,ytd-transcript-panel-renderer');
    if (!panel) return '';
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
    const out = [];
    for (const seg of segments) {
      const t = seg.querySelector('.segment-start, yt-formatted-string.segment-start') || seg.querySelector('yt-formatted-string[aria-label*=\":\"]');
      const textNode = seg.querySelector('.segment-text, yt-formatted-string.segment-text') || seg.querySelector('yt-formatted-string[dir]');
      const text = (textNode?.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (withTS) {
        const ts = (t?.textContent || '').trim();
        out.push(ts ? `[${ts}] ${text}` : text);
      } else {
        out.push(text);
      }
    }
    return out.join('\n');
  } catch { return ''; }
};

export const tryDomPanel = async (_track, _videoId, withTS) => {
  try {
    // If already open, scrape directly
    let text = scrapeTranscript(withTS);
    if (text?.trim()) {
      reportStatus('Loaded via transcript panel');
      return { ok: true, text, via: 'dom:panel' };
    }
    // Try to open the panel quietly and scrape
    reportStatus('Opening transcript panel…');
    await openTranscriptPanel();
    text = scrapeTranscript(withTS);
    if (text?.trim()) {
      reportStatus('Loaded via transcript panel');
      return { ok: true, text, via: 'dom:panel' };
    }
  } catch {}
  return { ok: false };
};

