import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// package.json sürümü ile CHANGELOG.md'deki en son sürüm aynı olmalı (her güncellemede ikisi birlikte artırılır)
test('sürüm: package.json ve CHANGELOG.md uyumlu', () => {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const latest = readFileSync('CHANGELOG.md', 'utf8').match(/^## (\d+\.\d+\.\d+)/m)?.[1];
  assert.equal(latest, version, `CHANGELOG.md en üstteki sürüm (${latest}) package.json (${version}) ile aynı olmalı`);
});
