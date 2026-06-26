#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Generate a minimal valid silent MP3 buffer.
 *
 * Frame header: MPEG-1 Layer III, 32 kbps, 44.1 kHz, stereo, no CRC,
 * no padding. 20 frames gives ~0.5 seconds of silence and is enough for
 * browsers to fire loadedmetadata / timeupdate / ended during tests.
 */
function createSilentMp3() {
  const header = Buffer.from([0xff, 0xfb, 0x10, 0x00]);
  const frameSize = 104; // including header
  const sideInfoSize = 32; // stereo
  const dataSize = frameSize - header.length - sideInfoSize;
  const frame = Buffer.concat([header, Buffer.alloc(dataSize, 0)]);
  return Buffer.concat(Array.from({ length: 20 }, () => frame));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield fullPath;
    }
  }
}

function extractAudioUrls(source) {
  const urls = new Set();
  const pattern = /audioUrl\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    urls.add(match[1]);
  }
  return urls;
}

const featuresDir = path.join(projectRoot, 'src', 'features');
const urls = new Set();

for (const filePath of walk(featuresDir)) {
  const source = fs.readFileSync(filePath, 'utf-8');
  for (const url of extractAudioUrls(source)) {
    urls.add(url);
  }
}

const buffer = createSilentMp3();
const created = [];

for (const url of urls) {
  if (!url.startsWith('/')) {
    console.warn(`Skipping non-root-relative audio URL: ${url}`);
    continue;
  }
  const targetPath = path.join(projectRoot, 'public', url.slice(1));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
  created.push(url);
}

created.sort();
console.log(`Generated ${created.length} placeholder audio files:`);
for (const url of created) {
  console.log(`  ${url}`);
}
