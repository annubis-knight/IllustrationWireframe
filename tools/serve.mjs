#!/usr/bin/env node
/**
 * Serveur statique minimal (zéro dépendance) pour le lab IllustrationWireframe.
 * Sert la racine du lab : dashboard + les 4 démos (dont les builds Vite dans leurs dist/).
 *
 * Usage : npm run dev   → http://localhost:4600/
 *         PORT=5000 npm run dev
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4600;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.splinecode': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8', // affiché dans l'onglet plutôt que téléchargé
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  let file = resolve(ROOT, '.' + decodeURIComponent(pathname));

  // Empêche toute sortie de la racine du lab (../../)
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    res.writeHead(403).end('403');
    return;
  }

  try {
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' }).end();
        return;
      }
      file = join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 — ' + pathname);
  }
}).listen(PORT, () => {
  console.log(`\n  ▸ Lab IllustrationWireframe : http://localhost:${PORT}/\n`);
});
