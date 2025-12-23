/**
 * Icon component - Creates SVG icon from path data
 */

import { svg } from '../../lib/dom.js';
import { icons } from '../../lib/icons.js';

export function Icon(name, size = 14, attrs = {}) {
  const paths = icons[name];
  if (!paths) {
    console.warn(`Icon "${name}" not found`);
    return document.createTextNode('');
  }
  return svg(paths, size, attrs);
}
