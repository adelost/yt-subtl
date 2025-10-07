// Minimal fetch proxy so we can reliably grab cross-origin caption URLs.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'FETCH_CAPTION') {
    if (!msg.url) {
      sendResponse({ ok: false, error: 'No URL provided' });
      return;
    }

    // Use 'include' to pass cookies for authenticated content (members-only, age-restricted)
    fetch(msg.url, { credentials: 'include' })
      .then(async (res) => {
        if (!res) {
          sendResponse({ ok: false, error: 'Empty response' });
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        const body = await res.text();
        sendResponse({ ok: res.ok, status: res.status, contentType, body });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err?.message || String(err) });
      });
    return true; // keep message channel open for async response
  }
  return false;
});
