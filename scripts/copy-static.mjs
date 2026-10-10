// Copies non-bundled extension files into dist/ after vite builds the
// content script. Source of truth for manifest/styles/background lives in
// src/static/ (dist/ is build output, never hand-edited).
import { copyFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(root, 'src', 'static');
const dist = join(root, 'dist');

for (const file of readdirSync(staticDir)) {
  copyFileSync(join(staticDir, file), join(dist, file));
}

console.log('copied static extension files -> dist/');
