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
  // When running in world: "MAIN", chrome.runtime.sendMessage requires extension ID as first param
  chrome.runtime.sendMessage(chrome.runtime.id, { type: 'FETCH_CAPTION', url }, (resp) => {
    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
    if (!resp?.ok) return reject(new Error(resp?.error || 'Fetch failed'));
    resolve(resp);
  });
});
