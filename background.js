// Minimal fetch proxy so we can reliably grab cross-origin caption URLs.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'FETCH_CAPTION') {
    fetch(msg.url, { credentials: 'omit' })
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        const body = await res.text();
        sendResponse({ ok: res.ok, status: res.status, contentType, body });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // keep message channel open for async response
  }
});
