import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export async function exampleInputDigest() {
  async function walk(directory) {
    const entries = await readdir(resolve(root, directory), {withFileTypes: true});
    const files = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : `${directory}/${entry.name}`));
    return files.flat();
  }
  const paths = [...await walk('src'), 'index.html', 'vite.config.ts', 'package.json', 'package-lock.json', 'scripts/update-examples.mjs', 'scripts/check-examples.mjs', 'scripts/example-integrity.mjs'].sort();
  const hash = createHash('sha256');
  for (const path of paths) {
    const bytes = await readFile(resolve(root, path));
    // Git may check out LF or CRLF. Both represent the same screenshot input.
    const normalized = /\.(?:ts|js|mjs|css|html|json|svg)$/.test(path) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
    hash.update(path+'\0').update(sha256(normalized)+'\0');
  }
  return hash.digest('hex');
}
