// Checks internal links, assets and same-page anchors in the built site (dist/).
// Run after `npm run build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecutá primero: npm run build');
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function pagePath(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  return '/' + rel.replace(/index\.html$/, '');
}

function targetExists(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = join(DIST, decoded);
  if (decoded.endsWith('/')) return existsSync(join(candidate, 'index.html'));
  return existsSync(candidate) && statSync(candidate).isFile();
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
const idsByPage = new Map();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  idsByPage.set(pagePath(file), new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

const problems = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const page = pagePath(file);

  if (/example\.(com|org|net)/i.test(html)) problems.push(`${page}: contiene un dominio de ejemplo`);

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)) continue;
    checked += 1;
    const url = new URL(value, `http://local${page}`);
    const targetPage = url.pathname;

    if (!targetExists(targetPage)) {
      problems.push(`${page}: enlace roto → ${value}`);
      continue;
    }
    if (targetPage.endsWith('/') && !targetPage.endsWith('/index.html') && url.hash) {
      const ids = idsByPage.get(targetPage);
      const id = decodeURIComponent(url.hash.slice(1));
      if (ids && !ids.has(id)) problems.push(`${page}: ancla inexistente → ${value}`);
    }
    if (!targetPage.endsWith('/') && !/\.[a-z0-9]+$/i.test(targetPage)) {
      problems.push(`${page}: falta la barra final → ${value}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Se encontraron ${problems.length} problemas:\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

console.log(`Enlaces internos OK: ${checked} enlaces revisados en ${htmlFiles.length} páginas.`);
