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
  try {
    const res = await fetch(url, { credentials: 'include' });
    const contentType = res.headers.get('content-type') || 'unknown';
    const body = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        details: `Status: ${res.status}, Content-Type: ${contentType}, Body: ${body.substring(0, 500)}`
      };
    }

    if (body.length === 0) {
      return {
        ok: false,
        error: 'Empty response',
        details: `Status: ${res.status}, Content-Type: ${contentType}, Body is empty. URL: ${url.substring(0, 100)}`
      };
    }

    // Check if we got HTML when we expected JSON/VTT
    if (contentType.includes('text/html')) {
      return {
        ok: false,
        error: 'Got HTML instead of captions',
        details: `Received HTML page instead of caption data. Body preview: ${body.substring(0, 500)}`
      };
    }

    return { ok: true, status: res.status, contentType, body };
  } catch (err) {
    return {
      ok: false,
      error: err.message || String(err),
      details: `Network error: ${err.message}`
    };
  }
};
