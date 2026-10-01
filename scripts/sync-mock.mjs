import { readdir, readFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = resolve('mock');
const target = resolve('apps/help-desk/webapp/localService/mainService');
const check = process.argv.includes('--check');
const files = ['metadata.xml', ...(await readdir(`${source}/data`)).filter(name => /\.(json|js)$/.test(name)).map(name => `data/${name}`)];
if (!check) await mkdir(`${target}/data`, { recursive: true });
for (const file of files) {
  if (check) {
    if (!(await readFile(`${source}/${file}`)).equals(await readFile(`${target}/${file}`))) {
      throw new Error(`${file} is out of sync. Run npm run mock:sync.`);
    }
  } else await copyFile(`${source}/${file}`, `${target}/${file}`);
}
console.log(`${check ? 'Verified' : 'Synchronized'} ${files.length} mock contract files.`);
