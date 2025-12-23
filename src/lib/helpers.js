/**
 * UI helper utilities
 */

// Format milliseconds to timestamp string
export const msToTimestamp = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (h > 0 ? String(h).padStart(2, '0') + ':' : '') +
         String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

// Escape regex special chars
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Highlight text with query
export const highlightText = (text, query, className = 'ytxt-highlight') => {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, `<mark class="${className}">$1</mark>`);
};

// Escape HTML
export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Parse timestamp [HH:MM:SS] or [MM:SS] to seconds
export const parseTimestamp = (line) => {
  let match = line.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]/);
  if (match) {
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
  }
  match = line.match(/^\[(\d{1,2}):(\d{2})\]/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return null;
};

// Get timestamp string from line (supports HH:MM:SS and MM:SS)
export const getTimestamp = (line) => {
  const match = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
  return match ? match[1] : null;
};

// Get content without timestamp (supports HH:MM:SS and MM:SS)
export const getContent = (line) => {
  return line.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '');
};

// Seek video to time
export const seekVideo = (seconds) => {
  const video = document.querySelector('video');
  if (video && seconds !== null) {
    video.currentTime = seconds;
    if (video.paused) video.play();
  }
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Download text as file
export const downloadText = (text, filename) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  getBool: (key, defaultValue = false) => {
    return localStorage.getItem(key) === 'true' || (localStorage.getItem(key) === null && defaultValue);
  },
  setBool: (key, value) => {
    localStorage.setItem(key, value ? 'true' : 'false');
  },
};
