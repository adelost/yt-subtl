// Generic utility functions

export const msToTimestamp = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (h > 0 ? String(h).padStart(2, '0') + ':' : '') +
         String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export const fetchCaption = async (url) => {
  // Fetch directly from MAIN world - we have access to YouTube's cookies here
  console.log('[ytxt] Fetching caption:', url.substring(0, 100));

  try {
    const res = await fetch(url, { credentials: 'include' });
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();

    console.log('[ytxt] Response:', {
      status: res.status,
      contentType,
      bodyLength: body.length
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true, status: res.status, contentType, body };
  } catch (err) {
    console.error('[ytxt] Fetch error:', err);
    return { ok: false, error: err.message || String(err) };
  }
};
