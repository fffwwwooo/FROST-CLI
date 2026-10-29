'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = __dirname;
const DIST_DIR    = path.join(PROJECT_DIR, 'dist');
const DESKTOP_DIR = path.join(require('os').homedir(), 'Desktop');

const OUTPUT_FROST_EXE     = path.join(DIST_DIR, 'FROST-CLI.exe');
const DESKTOP_FROST_EXE    = path.join(DESKTOP_DIR, 'FROST-CLI.exe');
const DESKTOP_ANTIGRAV_EXE = path.join(DESKTOP_DIR, 'Antigravity-CLI.exe');
const DIST_ANTIGRAV_EXE    = path.join(DIST_DIR, 'Antigravity-CLI.exe');
const ICON_PATH            = path.join(PROJECT_DIR, 'app_icon.ico');
const RCEDIT_PATH          = path.join(PROJECT_DIR, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

function log(msg) { console.log(`\x1b[38;2;235;42;54m[BUILD]\x1b[0m ${msg}`); }
function ok(msg)  { console.log(`\x1b[38;2;63;185;80m[SUCCESS]\x1b[0m ${msg}`); }

if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

// 1. Bundle with esbuild
log('1/6 Bundling app.js (FROST CLI with Full PC Access) with esbuild…');
execSync('npx esbuild app.js --bundle --platform=node --target=node24 --outfile=dist/bundle.js', {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
});

// 2. Generate SEA preparation blob
log('2/6 Generating Node.js Single Executable Application blob…');
const seaConfig = {
  main: path.join(DIST_DIR, 'bundle.js').replace(/\\/g, '/'),
  output: path.join(DIST_DIR, 'sea-prep.blob').replace(/\\/g, '/'),
  disableExperimentalSEAWarning: true,
};
const seaConfigFile = path.join(DIST_DIR, 'sea-config.json');
fs.writeFileSync(seaConfigFile, JSON.stringify(seaConfig, null, 2));

execSync(`node --experimental-sea-config "${seaConfigFile}"`, {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
});

// 3. Prepare base binary & inject custom FROST icon & metadata (eliminating Node.js branding)
log('3/6 Preparing standalone PE binary (embedding custom FROST icon & metadata)…');
fs.copyFileSync(process.execPath, OUTPUT_FROST_EXE);

if (fs.existsSync(RCEDIT_PATH) && fs.existsSync(ICON_PATH)) {
  log('Setting custom Cyber-Frost application icon (.ico) and executable info…');
  execSync(`"${RCEDIT_PATH}" "${OUTPUT_FROST_EXE}" --set-icon "${ICON_PATH}" --set-version-string FileDescription "FROST CLI 2.0 - Autonomous AI Agent" --set-version-string ProductName "FROST CLI" --set-version-string CompanyName "FROST Core" --set-file-version 2.0.0.0 --set-product-version 2.0.0.0`, {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
  });
}

function removeSignature(exePath) {
  const buf = fs.readFileSync(exePath);
  const peOffset = buf.readUInt32LE(0x3c);
  const magic = buf.readUInt16LE(peOffset + 24);
  const certOffset = magic === 0x20b ? peOffset + 168 : peOffset + 152;
  const certAddr = buf.readUInt32LE(certOffset);
  const certSize = buf.readUInt32LE(certOffset + 4);

  if (certAddr > 0 && certSize > 0) {
    buf.writeUInt32LE(0, certOffset);
    buf.writeUInt32LE(0, certOffset + 4);
    const truncated = buf.slice(0, certAddr);
    fs.writeFileSync(exePath, truncated);
  } else {
    fs.writeFileSync(exePath, buf);
  }
}
log('Stripping old Authenticode signature…');
removeSignature(OUTPUT_FROST_EXE);

// 4. Inject SEA payload into FROST-CLI.exe
log('4/6 Injecting Node.js SEA payload into FROST-CLI.exe…');
execSync(`npx postject "${OUTPUT_FROST_EXE}" NODE_SEA_BLOB "${seaConfig.output}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
});

// 5. Test execution
log('5/6 Verifying standalone FROST-CLI.exe…');
const testOut = execSync(`"${OUTPUT_FROST_EXE}" chat`, {
  input: '/help\n',
  encoding: 'utf8',
  timeout: 10000,
});

if (testOut.includes('FROST CLI') || testOut.includes('FROST KERNEL')) {
  ok('FROST-CLI.exe verified and working with custom icon!');
} else {
  throw new Error('Verification failed. Unexpected output.');
}

// 6. Copy to Desktop & keep aliases
log('6/6 Copying to Desktop with new icon…');
try {
  try {
    execSync('powershell -Command "Stop-Process -Name FROST-CLI -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
  } catch {}
  fs.copyFileSync(OUTPUT_FROST_EXE, DESKTOP_FROST_EXE);
  fs.copyFileSync(OUTPUT_FROST_EXE, DESKTOP_ANTIGRAV_EXE);
  fs.copyFileSync(OUTPUT_FROST_EXE, DIST_ANTIGRAV_EXE);
  ok(`Copied standalone executable with custom icon to Desktop: ${DESKTOP_FROST_EXE}`);
} catch (e) {
  console.warn(`Could not copy to Desktop: ${e.message}`);
}

const stats = fs.statSync(OUTPUT_FROST_EXE);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
ok(`Build complete! File size: ${sizeMb} MB`);
console.log(`\nBinary location: \x1b[38;2;235;42;54m${OUTPUT_FROST_EXE}\x1b[0m`);
console.log(`Desktop location: \x1b[38;2;235;42;54m${DESKTOP_FROST_EXE}\x1b[0m\n`);
