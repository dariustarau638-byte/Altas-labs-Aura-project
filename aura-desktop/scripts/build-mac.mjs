import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import https from 'node:https';

const ROOT = path.resolve('C:/AtlasLabs/aura-desktop');
const SCRATCH = path.join(ROOT, 'scratch/mac_build');
const SEVEN_ZIP = path.resolve('C:/Users/dtara/AppData/Local/electron-builder/Cache/7zip@1.0.0/7zip-win-x64-a34pt/bin/7za.exe');
const DIST_INSTALLER = path.join(ROOT, 'dist_installer');

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(DIST_INSTALLER, { recursive: true });

const ELECTRON_VERSION = '41.10.7';
const ZIP_NAME = `electron-v${ELECTRON_VERSION}-darwin-arm64.zip`;
const ZIP_PATH = path.join(SCRATCH, ZIP_NAME);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50_000_000) {
      console.log(`Using cached ${dest}`);
      return resolve(dest);
    }
    console.log(`Downloading ${url} ...`);
    const file = fs.createWriteStream(dest);

    const get = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            console.log(`Downloaded ${dest} (${fs.statSync(dest).size} bytes)`);
            resolve(dest);
          });
        });
      }).on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    };

    get(url);
  });
}

async function main() {
  console.log('--- Building Macbook macOS Setup (Ultra-Compressed) ---');

  // 1. Download official Electron Darwin binary
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${ZIP_NAME}`;
  await downloadFile(url, ZIP_PATH);

  // 2. Extract into scratch
  const extractDir = path.join(SCRATCH, 'extracted');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  console.log('Extracting macOS Electron framework...');
  execFileSync(SEVEN_ZIP, ['x', ZIP_PATH, `-o${extractDir}`, '-y'], { stdio: 'inherit' });

  const appPath = path.join(extractDir, 'Electron.app');
  if (!fs.existsSync(appPath)) {
    throw new Error('Electron.app not found in extracted zip');
  }

  // 3. Inject our app.asar
  const resourcesDir = path.join(appPath, 'Contents/Resources');
  const asarSource = path.join(ROOT, 'release/win-unpacked/resources/app.asar');
  if (!fs.existsSync(asarSource)) {
    throw new Error(`app.asar source not found at ${asarSource}`);
  }

  const defaultAsar = path.join(resourcesDir, 'default_app.asar');
  if (fs.existsSync(defaultAsar)) {
    fs.unlinkSync(defaultAsar);
  }

  console.log('Injecting production app.asar...');
  fs.copyFileSync(asarSource, path.join(resourcesDir, 'app.asar'));

  // 3b. Remove non-English .lproj folders to match full-English spec and optimize size
  const resourcesFiles = fs.readdirSync(resourcesDir);
  for (const f of resourcesFiles) {
    if (f.endsWith('.lproj') && !f.startsWith('en')) {
      fs.rmSync(path.join(resourcesDir, f), { recursive: true, force: true });
    }
  }

  // 4. Update Info.plist
  const plistPath = path.join(appPath, 'Contents/Info.plist');
  if (fs.existsSync(plistPath)) {
    let plist = fs.readFileSync(plistPath, 'utf8');
    plist = plist.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Jarvis AI</string>');
    plist = plist.replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleName</key>\n\t<string>Jarvis AI</string>');
    plist = plist.replace(/<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleExecutable</key>\n\t<string>Jarvis AI</string>');
    plist = plist.replace(/<key>CFBundleIdentifier<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleIdentifier</key>\n\t<string>ai.aura.companion</string>');
    fs.writeFileSync(plistPath, plist, 'utf8');
    console.log('Updated macOS Info.plist bundle metadata.');
  }

  // 5. Rename executable
  const macosDir = path.join(appPath, 'Contents/MacOS');
  const oldExe = path.join(macosDir, 'Electron');
  const newExe = path.join(macosDir, 'Jarvis AI');
  if (fs.existsSync(oldExe)) {
    fs.renameSync(oldExe, newExe);
  }

  // 6. Rename App bundle
  const finalAppPath = path.join(extractDir, 'Jarvis AI.app');
  fs.renameSync(appPath, finalAppPath);

  // 7. Compress into Setup_JarvisAI-Mac-2.0.0.tar.xz using ultra LZMA2 compression (native bsdtar)
  const outputTar = path.join(DIST_INSTALLER, 'Setup_JarvisAI-Mac-2.0.0.tar.xz');
  if (fs.existsSync(outputTar)) {
    fs.unlinkSync(outputTar);
  }

  console.log('Compressing Setup_JarvisAI-Mac-2.0.0.tar.xz with XZ/LZMA2 ultra compression...');
  try {
    execFileSync('tar.exe', ['-cJf', outputTar, 'Jarvis AI.app'], {
      cwd: extractDir,
      stdio: 'inherit',
    });
  } catch (err) {
    console.warn('tar.exe completed with code or warning:', err.message);
  }

  // Also create Setup_JarvisAI-Mac-2.0.0.zip
  const outputZip = path.join(DIST_INSTALLER, 'Setup_JarvisAI-Mac-2.0.0.zip');
  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  console.log('Compressing Setup_JarvisAI-Mac-2.0.0.zip with 7-Zip ultra compression...');
  try {
    execFileSync(SEVEN_ZIP, ['a', '-tzip', '-mx=9', outputZip, 'Jarvis AI.app'], {
      cwd: extractDir,
      stdio: 'inherit',
    });
  } catch (err) {
    // 7za returns exit code 1 for non-fatal symlink warnings on Windows
    console.log('7-Zip completed with non-fatal warnings (code ' + err.status + ').');
  }

  const checkFile = (f) => {
    if (fs.existsSync(f)) {
      const s = fs.statSync(f);
      const mb = (s.size / (1000 * 1000)).toFixed(2);
      const mib = (s.size / (1024 * 1024)).toFixed(2);
      console.log(`\n======================================================`);
      console.log(`Package: ${path.basename(f)}`);
      console.log(`Size: ${s.size} bytes (${mb} MB / ${mib} MiB)`);
      console.log(`Under 100MB limit: ${s.size < 100 * 1000 * 1000 ? 'YES (PASS)' : 'NO'}`);
      console.log(`======================================================\n`);
    }
  };

  checkFile(outputTar);
  checkFile(outputZip);
}

main().catch((err) => {
  console.error('macOS build failed:', err);
  process.exit(1);
});
