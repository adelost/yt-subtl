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
    const res = await fetch(url, {
      credentials: 'include',
      mode: 'cors'
    });

    const contentType = res.headers.get('content-type') || 'unknown';

    // Collect response metadata for debugging
    const responseInfo = {
      status: res.status,
      statusText: res.statusText,
      redirected: res.redirected,
      type: res.type,
      url: res.url.substring(0, 150),
      contentType: contentType
    };

    // Try reading body
    const body = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        details: `Response: ${JSON.stringify(responseInfo)}\nBody: ${body.substring(0, 300)}`
      };
    }

    if (body.length === 0) {
      // Get headers for debugging
      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        ok: false,
        error: 'Empty response body',
        details: `Response info: ${JSON.stringify(responseInfo)}\nHeaders: ${JSON.stringify(headers)}\nRequested: ${url.substring(0, 150)}`
      };
    }

    // Check if we got HTML when we expected JSON/VTT
    if (contentType.includes('text/html')) {
      return {
        ok: false,
        error: 'Got HTML instead of captions',
        details: `Received HTML page instead of caption data.\nResponse: ${JSON.stringify(responseInfo)}\nBody preview: ${body.substring(0, 500)}`
      };
    }

    return { ok: true, status: res.status, contentType, body };
  } catch (err) {
    return {
      ok: false,
      error: err.message || String(err),
      details: `Network error: ${err.message}\nURL: ${url.substring(0, 150)}`
    };
  }
};
