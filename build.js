'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IS_WIN   = process.platform === 'win32';
const IS_MAC   = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

const PROJECT_DIR = __dirname;
const DIST_DIR    = path.join(PROJECT_DIR, 'dist');
const DESKTOP_DIR = path.join(require('os').homedir(), 'Desktop');

const BINARY_NAME       = IS_WIN ? 'tokify.exe' : 'tokify';
const OUTPUT_TOKIFY     = path.join(DIST_DIR, BINARY_NAME);
const DESKTOP_TOKIFY    = path.join(DESKTOP_DIR, BINARY_NAME);
const ICON_PATH         = path.join(PROJECT_DIR, 'app_icon.ico');
const RCEDIT_PATH       = path.join(PROJECT_DIR, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

function log(msg) { console.log(`\x1b[38;2;235;42;54m[BUILD]\x1b[0m ${msg}`); }
function ok(msg)  { console.log(`\x1b[38;2;63;185;80m[SUCCESS]\x1b[0m ${msg}`); }

if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

// 1. Bundle with esbuild
log(`1/6 Bundling app.js for ${process.platform} with esbuild…`);
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

// 3. Prepare base binary
log(`3/6 Preparing standalone binary (${BINARY_NAME})…`);
fs.copyFileSync(process.execPath, OUTPUT_TOKIFY);

if (IS_WIN) {
  if (fs.existsSync(RCEDIT_PATH) && fs.existsSync(ICON_PATH)) {
    log('Setting custom tokify. application icon (.ico) and executable info…');
    execSync(`"${RCEDIT_PATH}" "${OUTPUT_TOKIFY}" --set-icon "${ICON_PATH}" --set-version-string FileDescription "tokify. 2.0 - Autonomous AI Agent" --set-version-string ProductName "tokify." --set-version-string CompanyName "tokify." --set-file-version 2.0.0.0 --set-product-version 2.0.0.0`, {
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
  removeSignature(OUTPUT_TOKIFY);
} else if (IS_MAC) {
  log('Removing macOS codesign signature…');
  try { execSync(`codesign --remove-signature "${OUTPUT_TOKIFY}"`, { stdio: 'ignore' }); } catch {}
}

// 4. Inject SEA payload
log(`4/6 Injecting Node.js SEA payload into ${BINARY_NAME}…`);
const machoFlag = IS_MAC ? ' --macho-segment-name NODE_SEA' : '';
execSync(`npx postject "${OUTPUT_TOKIFY}" NODE_SEA_BLOB "${seaConfig.output}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2${machoFlag}`, {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
});

if (!IS_WIN) {
  try { fs.chmodSync(OUTPUT_TOKIFY, 0o755); } catch {}
  if (IS_MAC) {
    log('Signing macOS binary ad-hoc…');
    try { execSync(`codesign --sign - "${OUTPUT_TOKIFY}"`, { stdio: 'ignore' }); } catch {}
  }
}

// 5. Test execution
log(`5/6 Verifying standalone ${BINARY_NAME}…`);
const testOut = execSync(`"${OUTPUT_TOKIFY}" chat`, {
  input: '/help\n',
  encoding: 'utf8',
  timeout: 10000,
});

if (testOut.includes('tokify') || testOut.includes('Доступные команды')) {
  ok(`${BINARY_NAME} verified and working!`);
} else {
  throw new Error('Verification failed. Unexpected output: ' + testOut);
}

// 6. Copy to Desktop
log('6/6 Copying to Desktop…');
try {
  if (IS_WIN) {
    try { execSync('powershell -Command "Stop-Process -Name tokify -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' }); } catch {}
  } else {
    try { execSync('pkill -f tokify || true', { stdio: 'ignore' }); } catch {}
  }
  if (fs.existsSync(DESKTOP_DIR)) {
    fs.copyFileSync(OUTPUT_TOKIFY, DESKTOP_TOKIFY);
    if (!IS_WIN) {
      try { fs.chmodSync(DESKTOP_TOKIFY, 0o755); } catch {}
    }
    ok(`Copied standalone executable to Desktop: ${DESKTOP_TOKIFY}`);
  }
} catch (e) {
  console.warn(`Could not copy to Desktop: ${e.message}`);
}

const stats = fs.statSync(OUTPUT_TOKIFY);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
ok(`Build complete! File size: ${sizeMb} MB`);
console.log(`\nBinary location: \x1b[38;2;235;42;54m${OUTPUT_TOKIFY}\x1b[0m\n`);
