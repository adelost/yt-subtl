// Bridge script running in ISOLATED world
// Forwards messages between MAIN world and background script

window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.origin !== location.origin) return;

  const msg = event.data;
  if (msg?.source !== 'ytxt-main' || msg?.type !== 'FETCH_CAPTION') return;

  try {
    // Forward to background script (chrome APIs available in ISOLATED world)
    chrome.runtime.sendMessage(
      { type: 'FETCH_CAPTION', url: msg.url },
      (resp) => {
        // Post response back to MAIN world
        window.postMessage({
          source: 'ytxt-bridge',
          requestId: msg.requestId,
          response: resp,
          error: chrome.runtime.lastError?.message
        }, '*');
      }
    );
  } catch (err) {
    window.postMessage({
      source: 'ytxt-bridge',
      requestId: msg.requestId,
      error: String(err)
    }, '*');
  }
});
