import { existsSync } from 'fs';
import { mkdir, rm, cp, copyFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const distChromeDir = resolve(rootDir, 'dist-chrome');
const distFirefoxDir = resolve(rootDir, 'dist-firefox');
const releaseDir = resolve(rootDir, 'release');

const chromeManifest = resolve(rootDir, 'manifest.json');
const firefoxManifest = resolve(rootDir, 'manifest.firefox.json');

const zipChrome = resolve(releaseDir, 'nodus-chrome.zip');
const zipFirefox = resolve(releaseDir, 'nodus-firefox.zip');

const run = (command) => {
  execSync(command, { stdio: 'inherit', cwd: rootDir });
};

const ensureFile = (filePath, label) => {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
};

const zipDir = async (sourceDir, outPath) => {
  await rm(outPath, { force: true });

  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolvePromise);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};

const main = async () => {
  ensureFile(chromeManifest, 'Chrome manifest');
  ensureFile(firefoxManifest, 'Firefox manifest');

  console.log('Building extension with Vite...');
  run('npm run build');

  if (!existsSync(distDir)) {
    throw new Error(`dist folder not found after build: ${distDir}`);
  }

  console.log('Preparing output folders...');
  await rm(distChromeDir, { recursive: true, force: true });
  await rm(distFirefoxDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });

  await cp(distDir, distChromeDir, { recursive: true });
  await cp(distDir, distFirefoxDir, { recursive: true });

  await copyFile(chromeManifest, resolve(distChromeDir, 'manifest.json'));
  await copyFile(firefoxManifest, resolve(distFirefoxDir, 'manifest.json'));

  console.log('Creating zip packages...');
  await zipDir(distChromeDir, zipChrome);
  await zipDir(distFirefoxDir, zipFirefox);

  console.log('Done.');
  console.log(`Chrome package: ${zipChrome}`);
  console.log(`Firefox package: ${zipFirefox}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
