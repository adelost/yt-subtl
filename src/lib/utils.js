// Generic utility functions

export const msToTimestamp = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (h > 0 ? String(h).padStart(2, '0') + ':' : '') +
         String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export const fetchCaption = (url) => new Promise((resolve, reject) => {
  // Generate unique request ID
  const requestId = `ytxt-${Date.now()}-${Math.random()}`;

  // Listen for response from bridge
  const listener = (event) => {
    if (event.origin !== location.origin) return;
    const msg = event.data;
    if (msg?.source !== 'ytxt-bridge' || msg?.requestId !== requestId) return;

    window.removeEventListener('message', listener);

    if (msg.error) return reject(new Error(msg.error));
    if (!msg.response?.ok) return reject(new Error(msg.response?.error || 'Fetch failed'));
    resolve(msg.response);
  };

  window.addEventListener('message', listener);

  // Post message to bridge (ISOLATED world)
  window.postMessage({
    source: 'ytxt-main',
    type: 'FETCH_CAPTION',
    url,
    requestId
  }, '*');

  // Timeout after 10 seconds
  setTimeout(() => {
    window.removeEventListener('message', listener);
    reject(new Error('Request timeout'));
  }, 10000);
});
