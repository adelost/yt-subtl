/**
 * Install the reviewed icon assets into dist.
 *
 * icon.svg is the editable design source. The checked-in 16/48/128 PNGs are
 * deliberately the raster source of truth for Chrome so this script remains
 * deterministic without native image dependencies.
 */
import {copyFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src', 'static');
const dist = join(root, 'dist');
mkdirSync(dist, {recursive: true});

for (const size of [16, 48, 128]) {
  copyFileSync(join(source, `icon${size}.png`), join(dist, `icon${size}.png`));
  console.log(`Installed icon${size}.png`);
}

copyFileSync(join(source, 'icon.svg'), join(dist, 'icon.svg'));
