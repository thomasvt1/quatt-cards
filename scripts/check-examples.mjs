import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {root, sha256, exampleInputDigest} from './example-integrity.mjs';

try {
  const manifest = JSON.parse(await readFile(resolve(root, 'examples/screenshots.json'), 'utf8'));
  assert.equal(manifest.inputDigest, await exampleInputDigest(), 'Screenshot inputs changed');
  const files = (await readdir(resolve(root, 'examples'))).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(files, [...manifest.files].sort(), 'PNG files differ from the generated manifest');
  const readme = await readFile(resolve(root, 'README.md'), 'utf8');
  for (const file of manifest.files) {
    assert.match(file, /^[a-z0-9-]+\.png$/, 'Invalid generated file name');
    assert.equal(sha256(await readFile(resolve(root, 'examples', file))), manifest.pngSha256[file], `${file} changed`);
    assert.ok(readme.includes(`examples/${file}`), `${file} is missing from README`);
  }
  console.log(`All ${files.length} committed examples match their source and manifest.`);
} catch (error) {
  console.error(`Examples are missing or stale: ${error.message}\nRun npm run update:examples and commit the PNGs, manifest and README.`);
  process.exitCode = 1;
}
