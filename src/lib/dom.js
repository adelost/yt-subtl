/**
 * DOM utilities - CSP-safe (no innerHTML)
 *
 * Usage:
 *   el('div', { class: 'foo', onClick: handler }, [
 *     el('span', {}, 'Hello'),
 *     el('button', { disabled: true }, 'Click')
 *   ])
 */

// Create element with attributes and children
export const el = (tag, attrs = {}, children = []) => {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      // Event handler: onClick -> click
      const event = key.slice(2).toLowerCase();
      element.addEventListener(event, value);
    } else if (key === 'class' || key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'data' && typeof value === 'object') {
      // data: { action: 'foo' } -> data-action="foo"
      for (const [k, v] of Object.entries(value)) {
        element.dataset[k] = v;
      }
    } else if (value === true) {
      element.setAttribute(key, '');
    } else if (value !== false && value != null) {
      element.setAttribute(key, value);
    }
  }

  // Handle children
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
};

// Create SVG element
export const svg = (paths, size = 14, attrs = {}) => {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('width', size);
  svgEl.setAttribute('height', size);
  svgEl.setAttribute('viewBox', '0 0 16 16');
  svgEl.setAttribute('fill', 'currentColor');
  svgEl.setAttribute('aria-hidden', 'true');

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'className') {
      svgEl.setAttribute('class', value);
    }
  }

  const pathArray = Array.isArray(paths) ? paths : [paths];
  for (const d of pathArray) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svgEl.appendChild(path);
  }

  return svgEl;
};

// Create text node
export const text = (str) => document.createTextNode(str);

// Create fragment with children
export const fragment = (...children) => {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      frag.appendChild(document.createTextNode(child));
    } else {
      frag.appendChild(child);
    }
  }
  return frag;
};

// Clear element children
export const clear = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

// Replace element children
export const replaceChildren = (element, ...children) => {
  clear(element);
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
};

// Query helpers
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

// Show/hide helpers
export const show = (el) => { if (el) el.style.display = ''; };
export const hide = (el) => { if (el) el.style.display = 'none'; };
export const toggle = (el, visible) => visible ? show(el) : hide(el);

// Add/remove class helpers
export const addClass = (el, ...classes) => el?.classList.add(...classes);
export const removeClass = (el, ...classes) => el?.classList.remove(...classes);
export const toggleClass = (el, className, force) => el?.classList.toggle(className, force);

// Set attribute helpers
export const setAttr = (el, key, value) => {
  if (value === true) el?.setAttribute(key, '');
  else if (value === false || value == null) el?.removeAttribute(key);
  else el?.setAttribute(key, value);
};

// Create highlighted text fragments (CSP-safe alternative to innerHTML)
export const highlightedText = (text, query, markClass = 'ytxt-highlight') => {
  if (!query || !text) {
    return document.createTextNode(text || '');
  }

  const frag = document.createDocumentFragment();
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      // Match - wrap in mark
      const mark = document.createElement('mark');
      mark.className = markClass;
      mark.textContent = part;
      frag.appendChild(mark);
    } else {
      // Non-match - text node
      frag.appendChild(document.createTextNode(part));
    }
  }

  return frag;
};
