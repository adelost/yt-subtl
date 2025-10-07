// Bridge script running in ISOLATED world
// Forwards messages between MAIN world and background script

console.log('[ytxt-bridge] Bridge script loaded in ISOLATED world');

window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.origin !== location.origin) return;

  const msg = event.data;
  if (msg?.source !== 'ytxt-main' || msg?.type !== 'FETCH_CAPTION') return;

  console.log('[ytxt-bridge] Received message from MAIN world:', msg.requestId);

  try {
    // Forward to background script (chrome APIs available in ISOLATED world)
    chrome.runtime.sendMessage(
      { type: 'FETCH_CAPTION', url: msg.url },
      (resp) => {
        console.log('[ytxt-bridge] Got response from background:', resp, chrome.runtime.lastError);

        // Log debug info to main console
        if (resp?._debug) {
          console.log('[background→bridge] Fetch debug:', resp._debug);
        }

        // Post response back to MAIN world
        window.postMessage({
          source: 'ytxt-bridge',
          requestId: msg.requestId,
          response: resp,
          error: chrome.runtime.lastError?.message
        }, '*');
        console.log('[ytxt-bridge] Posted response back to MAIN world');
      }
    );
  } catch (err) {
    console.error('[ytxt-bridge] Error:', err);
    window.postMessage({
      source: 'ytxt-bridge',
      requestId: msg.requestId,
      error: String(err)
    }, '*');
  }
});
