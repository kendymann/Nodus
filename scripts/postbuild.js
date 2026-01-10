import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = resolve(__dirname, '../dist');

const sidepanelHtmlPath = resolve(distDir, 'src/sidepanel/index.html');

if (existsSync(sidepanelHtmlPath)) {
  let html = readFileSync(sidepanelHtmlPath, 'utf-8');
  html = html.replace(/\.\.\/\.\.\/assets/g, './assets');
  writeFileSync(resolve(distDir, 'sidepanel.html'), html);
  console.log('Created dist/sidepanel.html with fixed paths');
}

