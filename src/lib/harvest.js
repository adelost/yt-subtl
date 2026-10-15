// Caption responses fetched by YouTube's own player, kept per video and track.
// Only the player's requests carry the token YouTube requires, so these are the
// caption bytes the extension reads.

const MAX_VIDEOS = 10;
const store = new Map(); // videoId -> Map<captionKey, { url, contentType, body }>
const waiters = new Set();

/** WHAT: Names one caption track of a video. WHY: Keeps manual and auto-generated captions of one language apart. */
export const captionKey = (languageCode, kind) => `${languageCode || ''}|${kind === 'asr' ? 'asr' : 'manual'}`;

/** WHAT: Reads which video and track a timedtext URL answers. WHY: Keeps translations and other videos' captions out of the store. */
export const describeCaptionUrl = (href) => {
  let url;
  try { url = new URL(href, 'https://www.youtube.com'); } catch { return null; }
  if (!url.pathname.includes('/api/timedtext')) return null;
  const params = url.searchParams;
  if (!params.get('v') || !params.get('lang') || params.get('tlang')) return null;
  return { videoId: params.get('v'), key: captionKey(params.get('lang'), params.get('kind')) };
};

/** WHAT: Stores a caption response the player fetched. WHY: Keeps a later request for the same track instant. */
export const onHarvestEvent = (detail) => {
  const caption = describeCaptionUrl(detail?.url);
  if (!caption || !detail.body) return;
  if (!store.has(caption.videoId) && store.size >= MAX_VIDEOS) store.delete(store.keys().next().value);
  const tracks = store.get(caption.videoId) || new Map();
  const entry = { url: detail.url, contentType: detail.contentType || '', body: detail.body };
  tracks.set(caption.key, entry);
  store.set(caption.videoId, tracks);
  for (const waiter of waiters) waiter(caption, entry);
};

/** WHAT: Returns captions the player already fetched for this track. WHY: Keeps a repeat request off the network. */
export const harvestedCaption = (videoId, track) => store.get(videoId)?.get(captionKey(track?.languageCode, track?.kind)) || null;

/** WHAT: Resolves when the player has fetched this track. WHY: Keeps the caller bound to one video and track with a deadline. */
export const awaitHarvestedCaption = (videoId, track, timeoutMs) => {
  // The player may have fetched it on its own, e.g. right after an ad.
  const existing = harvestedCaption(videoId, track);
  if (existing) return Promise.resolve(existing);
  const wanted = captionKey(track?.languageCode, track?.kind);
  return new Promise((resolve) => {
    const finish = (entry) => { clearTimeout(timer); waiters.delete(waiter); resolve(entry); };
    const waiter = (caption, entry) => { if (caption.videoId === videoId && caption.key === wanted) finish(entry); };
    const timer = setTimeout(() => finish(null), timeoutMs);
    waiters.add(waiter);
  });
};

/** WHAT: Wraps the page's fetch and XHR once to report caption responses. WHY: Keeps duplicate network wrappers out of the page. */
export const injectObserver = () => {
  if (window.__ytxtObserverInstalled) return;
  window.__ytxtObserverInstalled = true;

  const forward = async (url, readBody, contentType) => {
    if (!describeCaptionUrl(url)) return;
    const body = await readBody();
    if (body) window.dispatchEvent(new CustomEvent('ytxt:transcript-template', { detail: { url, body, contentType } }));
  };
  const warn = (error) => console.warn('[Copy Transcript for YouTube] caption capture failed', error);

  const originalFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const pending = originalFetch(input, init);
    const url = input instanceof Request ? input.url : String(input || '');
    pending.then((res) => forward(url, () => res.clone().text(), res.headers.get('content-type') || '').catch(warn), () => {});
    return pending;
  };

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__ytxtUrl = String(url || '');
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', () => {
      // responseText throws for json/arraybuffer responses, so check the type first.
      const text = this.responseType === '' || this.responseType === 'text' ? this.responseText : '';
      forward(this.__ytxtUrl, async () => text, this.getResponseHeader('content-type') || '').catch(warn);
    });
    return xhrSend.call(this, body);
  };
};
