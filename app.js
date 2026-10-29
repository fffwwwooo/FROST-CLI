#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  FROST CLI 2.0 — Autonomous AI Agent with Full PC Access
 *  • Shimmering Aurora / Frost Animated ASCII Logo
 *  • Full PC Access: Execute PowerShell, manage files, launch apps
 *  • 100% Single-Window: Zero extra popups, seamless interactive loop
 *  • Background DSH Web integration (http://127.0.0.1:3080)
 * ═══════════════════════════════════════════════════════════════════════ */
'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

if (process.platform === 'win32') {
  try { execSync('chcp 65001', { stdio: 'ignore' }); } catch {}
}

const chalk    = require('chalk');
const inquirer = require('inquirer');
const oraLib   = require('ora');
const boxen    = require('boxen');
const Table    = require('cli-table3');

const SAFE_SPINNER = {
  interval: 80,
  frames: ['—', '\\', '|', '/'],
};
function ora(opts) {
  if (typeof opts === 'string') opts = { text: opts };
  return oraLib({
    spinner: SAFE_SPINNER,
    ...opts,
  });
}

// ─── Environment & Constants ───
const HOME         = os.homedir();
const TOKENS_DIR   = path.join(HOME, '.dsh-launcher');
const TOKENS_FILE  = path.join(TOKENS_DIR, 'tokens.json');
const DSH_DIR      = path.join(HOME, '.dsh');
const DSH_SETTINGS = path.join(DSH_DIR, 'settings.yaml');
const DSH_CRED     = path.join(DSH_DIR, '.credentials.yaml');
const DESKTOP_KEYS = path.join(HOME, 'Desktop', 'keys.json');
const BASE_URL     = (process.env.FUNPAY_BASE || 'https://tokify.sale').replace(/\/+$/, '');
const VERSION      = '2.0.0';
const DSH_CRED_KEY = 'BUYTOKENS_API_KEY';
const DSH_DEFAULT_MODEL = 'claude-fable-5.1';
const DSH_PORT     = 3080;

const isTTY = Boolean(process.stdout.isTTY);
const rgb   = (r, g, b) => isTTY ? `\x1b[38;2;${r};${g};${b}m` : '';
const ESC   = (code)    => isTTY ? `\x1b[${code}m` : '';

const C = {
  reset:     ESC(0),
  bold:      ESC(1),
  dim:       ESC(2),
  italic:    ESC(3),
  under:     ESC(4),
  cyan:      rgb(88, 166, 255),   // #58a6ff
  ice:       rgb(121, 192, 255),  // #79c0ff
  green:     rgb(63, 185, 80),    // #3fb950
  orange:    rgb(255, 140, 0),    // #ff8c00
  yellow:    rgb(234, 179, 8),    // #eab308
  red:       rgb(248, 81, 73),    // #f85149
  purple:    rgb(188, 140, 255),  // #bc8cff
  snow:      rgb(240, 246, 252),  // #f0f6fc
  dimText:   rgb(139, 148, 158),  // #8b949e
  dimGray:   rgb(110, 118, 129),  // #6e7681
  darkLine:  rgb(48, 54, 61),     // #30363d
};

// ─── FROST Logo & Shimmering Aurora Palette (Claude Code Isometric Double-Line Style) ───
const FROST_LOGO = [
  '  ██████╗   ██████╗   ██████╗   ███████╗  ████████╗',
  '  ██╔═══╝   ██╔══██╗ ██╔═══██╗  ██╔════╝  ╚══██╔══╝',
  '  █████╗    ██████╔╝ ██║   ██║  ███████╗     ██║   ',
  '  ██╔══╝    ██╔══██╗ ██║   ██║  ╚════██║     ██║   ',
  '  ██║       ██║  ██║ ╚██████╔╝  ███████║     ██║   ',
  '  ╚═╝       ╚═╝  ╚═╝  ╚═════╝   ╚══════╝     ╚═╝   ',
];

// ─── Smooth Dark Red / Crimson Multi-Stop Gradient ───
function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function generateDarkRedGradient(totalSteps = 48) {
  const stops = [
    [65, 8, 14],    // Deep dark burgundy / blood wine
    [120, 14, 24],  // Dark garnet
    [180, 22, 36],  // Rich crimson ruby
    [235, 40, 52],  // Radiant scarlet
    [255, 75, 82],  // Soft ember glow highlight
    [235, 40, 52],  // Radiant scarlet
    [180, 22, 36],  // Rich crimson ruby
    [120, 14, 24],  // Dark garnet
    [65, 8, 14],    // Loop back seamlessly to deep dark burgundy
  ];
  const result = [];
  const segments = stops.length - 1;
  const stepsPerSeg = totalSteps / segments;
  for (let i = 0; i < totalSteps; i++) {
    const seg = Math.min(Math.floor(i / stepsPerSeg), segments - 1);
    const t = (i - seg * stepsPerSeg) / stepsPerSeg;
    const smoothT = (1 - Math.cos(t * Math.PI)) / 2; // Cosine easing for buttery smooth transitions
    result.push(lerpColor(stops[seg], stops[seg + 1], smoothT));
  }
  return result;
}
const RED_GRADIENT = generateDarkRedGradient(48);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Cyberpunk Monolith HUD Box (Idea 4) with Smooth Dark Red Shimmer ───
function renderCyberHudMonolith(shift = 0) {
  const borderCol = rgb(125, 18, 26);
  const tagCol    = rgb(235, 42, 54);
  const hotCol    = rgb(255, 75, 82);
  const totalW    = 78;

  const topTag1 = borderCol + '╔═[' + C.reset + tagCol + C.bold + ' FROST KERNEL v' + VERSION + ' ' + C.reset + borderCol + ']';
  const topTag2 = '[' + C.reset + tagCol + C.bold + ' AI CORE: ONLINE ' + C.reset + borderCol + ']═╗' + C.reset;
  const dashCount = Math.max(2, totalW - 20 - 18);
  const topBar = topTag1 + borderCol + '═'.repeat(dashCount) + topTag2;

  const telemetry = [
    hotCol + '[●]' + C.reset + ' OS: ' + C.snow + 'Win32 x64' + C.reset,
    hotCol + '[●]' + C.reset + ' Access: ' + tagCol + C.bold + 'Full Root' + C.reset,
    hotCol + '[●]' + C.reset + ' Engine: ' + C.snow + 'Autonomous' + C.reset,
    hotCol + '[●]' + C.reset + ' DSH Web: ' + tagCol + ':3080' + C.reset,
    hotCol + '[●]' + C.reset + ' Control: ' + C.snow + 'Single Win' + C.reset,
    hotCol + '[●]' + C.reset + ' State: ' + tagCol + 'Active' + C.reset,
  ];

  const telemetryPlain = [
    '[●] OS: Win32 x64',
    '[●] Access: Full Root',
    '[●] Engine: Autonomous',
    '[●] DSH Web: :3080',
    '[●] Control: Single Win',
    '[●] State: Active',
  ];

  const lines = [topBar];
  for (let r = 0; r < FROST_LOGO.length; r++) {
    const rawLine = FROST_LOGO[r];
    let leftColored = '';
    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c];
      if (ch === ' ') { leftColored += ch; continue; }
      const col = RED_GRADIENT[(Math.floor((c * RED_GRADIENT.length) / rawLine.length) + shift) % RED_GRADIENT.length];
      leftColored += rgb(col[0], col[1], col[2]) + ch + C.reset;
    }
    const rightPlain = telemetryPlain[r];
    const rightColored = telemetry[r];
    const pad = ' '.repeat(Math.max(1, totalW - 2 - rawLine.length - rightPlain.length));
    lines.push(borderCol + '║' + C.reset + leftColored + pad + rightColored + ' ' + borderCol + '║' + C.reset);
  }

  const bottomBar = borderCol + '╚' + '═'.repeat(totalW) + '╝' + C.reset;
  lines.push(bottomBar);

  return lines.join('\n');
}

// ─── Helpers ───
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function maskKey(k) { return (!k || k.length < 10) ? '***' : k.slice(0, 7) + '…' + k.slice(-4); }

function fmtTok(n) {
  if (n == null) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' млрд';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' млн';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' тыс';
  return Number(n).toLocaleString('ru-RU');
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── Token Management & Auto-Discovery ───
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch {}
  return { tokens: [], activeId: null };
}

function saveTokens(data) {
  ensureDir(TOKENS_DIR);
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function verifyKey(key) {
  const res = await fetch(`${BASE_URL}/public/key-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (res.status === 401) throw new Error('Ключ не найден или отключён');
  if (res.status === 400) throw new Error('Неверный формат ключа (sk-…)');
  if (!res.ok) throw new Error(`Сервер ответил кодом ${res.status}`);
  return await res.json();
}

async function fetchModels(key) {
  try {
    const res = await fetch(`${BASE_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.data || [])
      .filter(m => m && m.id && !/image|t2v|video/i.test(m.id))
      .map(m => m.id)
      .sort();
  } catch { return null; }
}

async function autoDiscoverTokens() {
  const data = loadTokens();
  const known = new Set(data.tokens.map(t => t.key.trim()));
  let modified = false;

  if (fs.existsSync(DESKTOP_KEYS)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DESKTOP_KEYS, 'utf8'));
      const list = Array.isArray(parsed.keys) ? parsed.keys : [];
      for (const item of list) {
        const k = (item.key || item).trim();
        if (k && k.startsWith('sk-') && !known.has(k)) {
          const id = 'key_' + Math.random().toString(36).slice(2, 8);
          const name = item.name && item.name !== k ? item.name : `Токен Desktop (${maskKey(k)})`;
          data.tokens.push({ id, name, key: k });
          known.add(k);
          modified = true;
        }
      }
    } catch {}
  }

  if (fs.existsSync(DSH_CRED)) {
    try {
      const cred = fs.readFileSync(DSH_CRED, 'utf8');
      const m = cred.match(/BUYTOKENS_API_KEY:\s*(sk-[a-zA-Z0-9_\-]+)/);
      if (m && m[1] && !known.has(m[1].trim())) {
        const k = m[1].trim();
        const id = 'key_' + Math.random().toString(36).slice(2, 8);
        data.tokens.push({ id, name: 'DSH Конфиг', key: k });
        known.add(k);
        modified = true;
      }
    } catch {}
  }

  if (data.tokens.length > 0 && (!data.activeId || !data.tokens.some(t => t.id === data.activeId))) {
    data.activeId = data.tokens[0].id;
    modified = true;
  }

  if (modified) saveTokens(data);
  return data;
}

function syncTokenToDsh(key) {
  try {
    ensureDir(DSH_DIR);
    let credLines = fs.existsSync(DSH_CRED) ? fs.readFileSync(DSH_CRED, 'utf8').split(/\r?\n/) : [];
    if (!credLines.some(l => /^version:/.test(l))) credLines.unshift('version: 1');
    let ri = credLines.findIndex(l => /^refs:/.test(l));
    if (ri < 0) { credLines.push('refs:'); ri = credLines.length - 1; }
    let end = credLines.findIndex((l, i) => i > ri && /^[^\s#]/.test(l));
    if (end < 0) end = credLines.length;

    const entry = `  ${DSH_CRED_KEY}: ${key}`;
    const at = credLines.findIndex((l, i) => i > ri && i < end && new RegExp('^\\s+' + DSH_CRED_KEY + ':').test(l));
    if (at >= 0) credLines[at] = entry; else credLines.splice(end, 0, entry);
    while (credLines.length && !credLines[credLines.length - 1].trim()) credLines.pop();
    fs.writeFileSync(DSH_CRED, credLines.join('\n') + '\n', 'utf8');
  } catch {}
}

function syncDshSettingsFull(tokenKey) {
  try {
    ensureDir(DSH_DIR);
    syncTokenToDsh(tokenKey);

    let setLines = fs.existsSync(DSH_SETTINGS) ? fs.readFileSync(DSH_SETTINGS, 'utf8').split(/\r?\n/) : [];

    let top = setLines.findIndex(l => /^llm-pi-ai:\s*$/.test(l));
    if (top >= 0) {
      let pend = setLines.findIndex((l, i) => i > top && /^[^\s#]/.test(l));
      if (pend < 0) pend = setLines.length;
      setLines.splice(top, pend - top);
    }

    let di = setLines.findIndex(l => /^agent-default-model:\s*$/.test(l));
    if (di >= 0) {
      let de = setLines.findIndex((l, i) => i > di && /^[^\s#]/.test(l));
      if (de < 0) de = setLines.length;
      const blk = setLines.slice(di, de);
      const pm = blk.map(l => (l.match(/^\s*provider:\s*(\S+)/) || [])[1]).find(Boolean);
      if (!pm || /^(tokify|buytokens)$/.test(pm)) setLines.splice(di, de - di);
    }

    if (!setLines.some(l => /^ui-onboarding:/.test(l))) {
      setLines.unshift('ui-onboarding:', '  welcomeNoticeVersion: 2026-08-13.1', '');
    }
    while (setLines.length && !setLines[setLines.length - 1].trim()) setLines.pop();
    if (setLines.length) setLines.push('');

    const modelList = [
      { id: 'claude-fable-5.1', context: 991808 },
      { id: 'claude-opus-5.5', context: 524288 },
      { id: 'claude-fable-5', context: 524288 },
      { id: 'claude-opus-5', context: 524288 },
      { id: 'claude-opus-4.7', context: 524288 },
      { id: 'gpt-6-astra', context: 524288 },
      { id: 'gpt-6-sol', context: 524288 },
    ];

    const prov = [
      '    tokify:',
      '      displayName: Tokify',
      `      apiKeyEnv: ${DSH_CRED_KEY}`,
      '      api: openai-completions',
      `      baseURL: ${BASE_URL}/v1`,
      '      defaultInput:',
      '        - text',
      '        - image',
      '      models:',
    ];
    for (const m of modelList) {
      prov.push(`        - id: ${m.id}`, `          contextWindow: ${m.context}`);
    }

    setLines.push(
      'llm-pi-ai:',
      '  providers:',
      ...prov,
      '',
      'agent-default-model:',
      '  provider: tokify',
      `  model: ${DSH_DEFAULT_MODEL}`
    );

    fs.writeFileSync(DSH_SETTINGS, setLines.join('\n') + '\n', 'utf8');
  } catch {}
}

// ─── Power Modes & Reasoning Levels ───
const POWER_MODES = [
  {
    id: 'high',
    label: 'High',
    desc: 'Максимальная (16K токенов, глубокое мышление)',
    maxTokens: 16384,
    effort: 'high',
    instruction: 'Operating mode: Maximum reasoning depth, exhaustive precision and deep analysis.',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: 'Баланс (8K токенов, стандарт)',
    maxTokens: 8192,
    effort: 'medium',
    instruction: 'Operating mode: Balanced standard speed and analytical depth.',
  },
  {
    id: 'low',
    label: 'Fast',
    desc: 'Быстрая (4K токенов, минимальная задержка)',
    maxTokens: 4096,
    effort: 'low',
    instruction: 'Operating mode: High-speed concise responses with lowest latency.',
  },
];

// ── Keyboard Shortcut Helpers (Shift+Tab & Ctrl+Tab) ──
function isShiftTab(s, key) {
  if (!key) return s === '\x1b[Z';
  if (key.name === 'tab' && key.shift) return true;
  if (key.sequence === '\x1b[Z') return true;
  if (key.code === '[Z') return true;
  if (key.name === 'f2') return true;
  return false;
}

function isCtrlTab(s, key) {
  if (!key) {
    return s === '\x1b[1;5I' || s === '\x1b[27;5;9~' || s === '\x1b[9;5u' || s === '\x1b[I' || s === '\t';
  }
  // If Shift is pressed, handled as Shift+Tab
  if (key.shift) return false;
  // In Windows conhost, Ctrl+Tab sends Tab (\t)
  if (key.name === 'tab') return true;
  if (s === '\t') return true;
  if (key.sequence === '\x1b[1;5I' || key.sequence === '\x1b[27;5;9~' || key.sequence === '\x1b[9;5u' || key.sequence === '\x1b[I') return true;
  if (key.ctrl && (key.sequence === '\t' || key.name === 'i')) return true;
  if (key.ctrl && (key.name === 'p' || key.sequence === '\x10')) return true; // Ctrl+P fallback
  if (key.name === 'f3') return true; // F3 fallback
  return false;
}

// ── Stealth Background DSH Web Daemon (Zero Window Flashes) ──
function getNodeExecutable() {
  const candidates = [
    'node',
    'node.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
    path.join(HOME, 'AppData', 'Roaming', 'nvm', 'current', 'node.exe'),
  ];
  for (const c of candidates) {
    if (c === 'node' || c === 'node.exe') continue;
    if (fs.existsSync(c)) return c;
  }
  return 'node';
}

function getDshBinPath() {
  const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
  const candidates = [
    path.join(appData, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(HOME, 'AppData', 'Roaming', 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf8', windowsHide: true, timeout: 3000 }).trim();
    const candidate2 = path.join(npmRoot, '@deepseek-ai', 'dsh', 'lib', 'bin.js');
    if (fs.existsSync(candidate2)) return candidate2;
  } catch {}
  return null;
}

async function isDshWebAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${DSH_PORT}`, { signal: AbortSignal.timeout(1500) });
    return res.status > 0;
  } catch { return false; }
}

let dshStartingPromise = null;
async function ensureDshWebSilent() {
  if (await isDshWebAlive()) return true;
  if (dshStartingPromise) return await dshStartingPromise;

  dshStartingPromise = (async () => {
    try {
      const dshBin = getDshBinPath();
      const nodeExe = getNodeExecutable();

      if (dshBin && fs.existsSync(dshBin)) {
        // Direct launch of node executable with bin.js:
        // No cmd.exe, no title changes, 100% hidden background process
        const child = spawn(nodeExe, [dshBin, 'web', '--no-open'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          shell: false,
        });
        child.unref();
      } else {
        // Fallback using PowerShell -WindowStyle Hidden to ensure no console flashes
        const psCmd = `Start-Process -FilePath 'cmd.exe' -ArgumentList '/c dsh web --no-open' -WindowStyle Hidden`;
        const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCmd], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          shell: false,
        });
        child.unref();
      }

      for (let i = 0; i < 25; i++) {
        await sleep(400);
        if (await isDshWebAlive()) return true;
      }
    } catch {}
    return false;
  })();

  const res = await dshStartingPromise;
  dshStartingPromise = null;
  return res;
}

// ═══════════════════════════════════════════════════════════════════════
// 🛠️ FULL PC ACCESS: SYSTEM AGENT TOOLS
// ═══════════════════════════════════════════════════════════════════════
const SYSTEM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_powershell',
      description: 'Execute any PowerShell command on the Windows PC. Has full system access to files, Desktop, apps, network, registry, processes, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The exact PowerShell command line to execute on the system',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite any file on the computer with specified text content',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path (e.g. C:\\Users\\...\\Desktop\\file.txt or relative path)',
          },
          content: {
            type: 'string',
            description: 'The full text content to write into the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of any file from the computer',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file to read',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and folders in a specified directory on the computer',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path to inspect (defaults to current directory or Desktop)',
          },
        },
        required: [],
      },
    },
  },
];

function executeSystemTool(name, args) {
  if (name === 'run_powershell') {
    try {
      const cmd = args.command;
      const res = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${cmd.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
      });
      return res || '(command completed successfully with no output)';
    } catch (e) {
      return `PowerShell Error: ${e.message}\nSTDOUT: ${e.stdout || ''}\nSTDERR: ${e.stderr || ''}`;
    }
  }

  if (name === 'write_file') {
    try {
      let targetPath = args.path;
      if (targetPath.startsWith('~')) targetPath = path.join(HOME, targetPath.slice(1));
      targetPath = path.resolve(targetPath);
      ensureDir(path.dirname(targetPath));
      fs.writeFileSync(targetPath, args.content, 'utf8');
      return `File written successfully to ${targetPath} (${args.content.length} characters)`;
    } catch (e) {
      return `Write File Error: ${e.message}`;
    }
  }

  if (name === 'read_file') {
    try {
      let targetPath = args.path;
      if (targetPath.startsWith('~')) targetPath = path.join(HOME, targetPath.slice(1));
      targetPath = path.resolve(targetPath);
      if (!fs.existsSync(targetPath)) return `Error: File not found at ${targetPath}`;
      const content = fs.readFileSync(targetPath, 'utf8');
      return content.length > 50000 ? content.slice(0, 50000) + '\n[...truncated]' : content;
    } catch (e) {
      return `Read File Error: ${e.message}`;
    }
  }

  if (name === 'list_directory') {
    try {
      let dir = args.path || process.cwd();
      if (dir.startsWith('~')) dir = path.join(HOME, dir.slice(1));
      dir = path.resolve(dir);
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items.map(i => `${i.isDirectory() ? '[DIR]' : '[FILE]'} ${i.name}`).join('\n') || '(directory is empty)';
    } catch (e) {
      return `List Directory Error: ${e.message}`;
    }
  }

  return `Unknown tool: ${name}`;
}

// ── Streaming Chat Client ──
async function* streamChat(messages, model, key, tools = null, power = POWER_MODES[0]) {
  const bodyPayload = {
    model,
    messages,
    stream: true,
    max_tokens: power?.maxTokens || 16384,
  };
  if (power?.effort) {
    bodyPayload.reasoning_effort = power.effort;
  }
  if (tools) {
    bodyPayload.tools = tools;
    bodyPayload.tool_choice = 'auto';
  }

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `HTTP error ${res.status}`;
    try {
      const errJson = JSON.parse(text);
      msg = errJson.error?.message || errJson.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf8');
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta) yield delta;
      } catch {}
    }
  }
}

// ── Non-streaming call for Agent Tool Decision Phase ──
async function callChatWithTools(messages, model, key, power = POWER_MODES[0]) {
  const payload = {
    model,
    messages,
    tools: SYSTEM_TOOLS,
    tool_choice: 'auto',
    max_tokens: power?.maxTokens || 16384,
  };
  if (power?.effort) {
    payload.reasoning_effort = power.effort;
  }

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `HTTP error ${res.status}`;
    try {
      const errJson = JSON.parse(text);
      msg = errJson.error?.message || errJson.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return await res.json();
}

// ── Animated Presentations ──
function renderTabBar(tabs = [], activeTabIdx = 0) {
  if (!tabs || tabs.length === 0) return '';
  let bar = `  ${C.snow}Вкладки:${C.reset} `;
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    const isAct = (i === activeTabIdx);
    const num = i + 1;
    if (isAct) {
      bar += `${C.cyan}[${C.green}● ${C.snow}${C.bold}${num}: ${t.title}${C.reset}${C.cyan}]${C.reset} `;
    } else {
      bar += `${C.dimGray}[${C.dimText}${num}: ${t.title}${C.dimGray}]${C.reset} `;
    }
  }
  bar += `${C.dimGray}[${C.ice}+ /new${C.dimGray}]${C.reset}`;
  return bar;
}

function printFrostHeader(token, model, keyInfo, power = POWER_MODES[0], shift = 0, tabs = [], activeTabIdx = 0) {
  const cwd = process.cwd().replace(/\\/g, '/');
  const cols = process.stdout.columns || 80;

  let accountLabel = 'fffwwooo123@gmail.com (Google AI Pro)';
  if (token) {
    const prefix = keyInfo?.prefix || maskKey(token.key);
    accountLabel = `${token.name || prefix} (Full PC Access: Active)`;
  }

  const dividerLen = Math.min(Math.max(cols - 2, 40), 90);

  console.log('');
  console.log(renderCyberHudMonolith(shift));
  console.log('');
  console.log(`  ${rgb(235, 42, 54)}${C.bold}FROST CLI ${VERSION}${C.reset} · ${rgb(255, 75, 82)}● Full PC Access${C.reset}`);
  console.log(`  ${C.dimText}${accountLabel}${C.reset}`);
  if (tabs && tabs.length > 0) {
    console.log(renderTabBar(tabs, activeTabIdx));
  }
  console.log(`  ${C.snow}● Модель: ${rgb(235, 55, 65)}${C.bold}${model}${C.reset}  ${C.snow}● Мощность: ${rgb(255, 110, 60)}${C.bold}[${power.label}]${C.reset} ${C.dimText}(${power.desc})${C.reset}`);
  console.log(`  ${C.dimGray}${cwd}${C.reset}`);
  console.log(`  ${C.dimGray}Горячие клавиши: ${rgb(235, 55, 65)}Shift+Tab${C.dimGray} (модель) | ${rgb(255, 110, 60)}Ctrl+Tab${C.dimGray} (мощность) | ${C.snow}Ctrl+T${C.dimGray} (новый чат) | ${rgb(235, 55, 65)}Alt+1..9${C.dimGray} (вкладка) | /help${C.reset}\n`);
  console.log(rgb(110, 16, 24) + '─'.repeat(dividerLen) + C.reset + '\n');
}

async function animateFrostHeader(token, model, keyInfo, power = POWER_MODES[0], tabs = [], activeTabIdx = 0) {
  console.clear();
  console.log('');

  // Smooth Dark Red Gradient Shimmer Animation across the Cyber Monolith HUD (12 frames)
  if (isTTY) {
    for (let f = 0; f < 12; f++) {
      process.stdout.write('\x1b[H\n');
      console.log(renderCyberHudMonolith(f * 2));
      await sleep(30);
    }
  }

  console.clear();
  printFrostHeader(token, model, keyInfo, power, 0, tabs, activeTabIdx);
}

async function animateToolStep(actionText, detailText, durationMs = 300) {
  if (!isTTY) {
    console.log(`  ${C.green}● ${actionText} ${detailText || ''}${C.reset}`);
    return;
  }
  const spinnerFrames = ['—', '\\', '|', '/'];
  const spinnerColors = [C.cyan, C.ice, C.snow, C.purple];
  let frameIdx = 0;
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    const frame = spinnerFrames[frameIdx % spinnerFrames.length];
    const color = spinnerColors[frameIdx % spinnerColors.length];
    frameIdx++;
    process.stdout.write(`\r\x1b[K  ${color}${frame}${C.reset} ${C.dimText}${actionText}…${C.reset}`);
    await sleep(40);
  }

  process.stdout.write(`\r\x1b[K  ${C.green}● ${actionText}${C.reset}`);
  if (detailText) process.stdout.write(` ${C.dimGray}${detailText}${C.reset}`);
  process.stdout.write('\n');
}

// ── Interactive Single-Window Chat Loop ──
async function runChat(options = {}) {
  let TOKEN_ID = options.tokenId || process.env.DSH_TOKEN_ID || '';
  let MODEL    = options.model   || process.env.DSH_MODEL    || '';
  const returnToMenu = Boolean(options.returnToMenu);

  if (isTTY) process.stdout.write(`\x1b]0;FROST CLI ${VERSION}\x07`);
  ensureDshWebSilent();

  const tokenStore = await autoDiscoverTokens();
  let currentToken = tokenStore.tokens.find(t => t.id === (TOKEN_ID || tokenStore.activeId)) || tokenStore.tokens[0];

  if (!currentToken) {
    console.error(`\n  ${C.red}✗ Токены не найдены! Сначала добавьте токен.${C.reset}\n`);
    await sleep(1500);
    return;
  }

  syncTokenToDsh(currentToken.key);

  const [availableModelsRaw, keyInfo] = await Promise.all([
    fetchModels(currentToken.key),
    verifyKey(currentToken.key).catch(() => null),
  ]);

  const defaultModels = [
    'claude-fable-5.1', 'claude-opus-5.5', 'claude-fable-5',
    'claude-opus-5', 'claude-opus-4.7', 'gpt-6-astra', 'gpt-6-sol',
  ];

  const availableModels = (availableModelsRaw && availableModelsRaw.length > 0)
    ? availableModelsRaw : defaultModels;

  let currentModel = MODEL;
  if (!currentModel) {
    if (availableModels.includes('claude-fable-5.1')) currentModel = 'claude-fable-5.1';
    else currentModel = availableModels[0];
  }

  let isBusy = false;
  let currentPowerIdx = 0; // Default High (16K tokens, deep thinking)

  // ── Multi-Chat / Tabs Architecture ──
  let tabs = [
    {
      id: 1,
      title: 'Чат 1',
      model: currentModel,
      powerIdx: currentPowerIdx,
      history: [],
    }
  ];
  let activeTabIdx = 0;
  const getActiveTab = () => tabs[activeTabIdx] || tabs[0];

  const getPromptString = () => {
    const curTab = getActiveTab();
    const p = POWER_MODES[curTab.powerIdx];
    return `${C.darkLine}[${C.ice}${activeTabIdx + 1}:${curTab.title}${C.darkLine} · ${C.cyan}${curTab.model}${C.darkLine} · ${C.yellow}${p.label}${C.darkLine}]${C.reset} ${C.cyan}${C.bold}> ${C.reset}`;
  };

  await animateFrostHeader(currentToken, currentModel, keyInfo, POWER_MODES[currentPowerIdx], tabs, activeTabIdx);

  if (isTTY) {
    try { readline.emitKeypressEvents(process.stdin); } catch {}
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPromptString(),
    historySize: 200,
    terminal: isTTY,
  });

  const safePrompt = () => {
    if (!rl.closed) {
      try {
        rl.setPrompt(getPromptString());
        rl.resume();
        rl.prompt();
      } catch {}
    }
  };

  let shimmerShift = 0;

  // ── Permanent Header Redraw (Clean, Zero Spam, Live Crimson Ripple) ──
  const redrawChatView = () => {
    shimmerShift = (shimmerShift + 2) % RED_GRADIENT.length;
    console.clear();
    const curTab = getActiveTab();
    printFrostHeader(currentToken, curTab.model, keyInfo, POWER_MODES[curTab.powerIdx], shimmerShift, tabs, activeTabIdx);

    if (curTab.history.length > 0) {
      for (const msg of curTab.history) {
        if (msg.role === 'user') {
          console.log(`\n  ${C.cyan}${C.bold}> ${C.reset}${C.snow}${msg.content}${C.reset}\n`);
        } else if (msg.role === 'assistant') {
          console.log(`${msg.content}\n`);
        }
      }
    }

    rl.setPrompt(getPromptString());
    if (isTTY) {
      process.stdout.write(`\x1b]0;FROST CLI 2.0 · [${curTab.title}] · ${curTab.model} · [${POWER_MODES[curTab.powerIdx].label}]\x07`);
    }
    rl._refreshLine();
  };

  // ── Tab Navigation & Actions ──
  const switchTab = (targetIdx) => {
    if (isBusy) return;
    if (targetIdx >= 0 && targetIdx < tabs.length) {
      activeTabIdx = targetIdx;
      const curTab = getActiveTab();
      currentModel = curTab.model;
      currentPowerIdx = curTab.powerIdx;
      redrawChatView();
    }
  };

  const createNewTab = (title = '') => {
    if (isBusy) return;
    const nextId = tabs.length > 0 ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
    const tabTitle = title.trim() || `Чат ${nextId}`;
    tabs.push({
      id: nextId,
      title: tabTitle,
      model: currentModel,
      powerIdx: currentPowerIdx,
      history: [],
    });
    activeTabIdx = tabs.length - 1;
    redrawChatView();
  };

  const closeCurrentTab = (targetIdx = activeTabIdx) => {
    if (isBusy) return;
    if (tabs.length <= 1) {
      tabs[0].title = 'Чат 1';
      tabs[0].history = [];
      activeTabIdx = 0;
      redrawChatView();
      return;
    }
    tabs.splice(targetIdx, 1);
    if (activeTabIdx >= tabs.length) activeTabIdx = tabs.length - 1;
    const curTab = getActiveTab();
    currentModel = curTab.model;
    currentPowerIdx = curTab.powerIdx;
    redrawChatView();
  };

  // ── Keyboard Shortcuts: Shift+Tab (Model) & Ctrl+Tab (Power) ──
  const cycleModel = () => {
    if (isBusy) return;
    const curTab = getActiveTab();
    const curIdx = availableModels.indexOf(curTab.model);
    curTab.model = availableModels[(curIdx + 1) % availableModels.length];
    currentModel = curTab.model;
    redrawChatView();
  };

  const cyclePower = () => {
    if (isBusy) return;
    const curTab = getActiveTab();
    curTab.powerIdx = (curTab.powerIdx + 1) % POWER_MODES.length;
    currentPowerIdx = curTab.powerIdx;
    redrawChatView();
  };

  // Intercept keypresses directly in readline TTY layer
  const origTTYWrite = rl._ttyWrite.bind(rl);
  rl._ttyWrite = function(s, key) {
    if (isShiftTab(s, key)) {
      cycleModel();
      return;
    }
    if (isCtrlTab(s, key)) {
      cyclePower();
      return;
    }
    // Ctrl+T (new tab)
    if ((key && key.ctrl && key.name === 't') || s === '\x14') {
      createNewTab();
      return;
    }
    // Ctrl+W (close tab)
    if ((key && key.ctrl && key.name === 'w') || s === '\x17') {
      closeCurrentTab();
      return;
    }
    // F6 or Ctrl+Right (next tab)
    if (key && (key.name === 'f6' || (key.ctrl && key.name === 'right'))) {
      switchTab((activeTabIdx + 1) % tabs.length);
      return;
    }
    // F7 or Ctrl+Left (prev tab)
    if (key && (key.name === 'f7' || (key.ctrl && key.name === 'left'))) {
      switchTab((activeTabIdx - 1 + tabs.length) % tabs.length);
      return;
    }
    // Alt+1..9 (jump directly to tab 1..9)
    if (key && key.meta && /^[1-9]$/.test(key.name)) {
      const idx = parseInt(key.name, 10) - 1;
      if (idx < tabs.length) { switchTab(idx); return; }
    }
    if (s && /^\x1b[1-9]$/.test(s)) {
      const idx = parseInt(s[1], 10) - 1;
      if (idx < tabs.length) { switchTab(idx); return; }
    }
    // Block any stray tab that would otherwise insert spaces/indentation
    if ((key && key.name === 'tab') || s === '\t') {
      cyclePower();
      return;
    }
    return origTTYWrite(s, key);
  };

  safePrompt();

  return new Promise((resolve) => {
    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { safePrompt(); return; }

      try {
        if (input.startsWith('/')) {
          const [cmd, ...args] = input.split(/\s+/);
          const argStr = args.join(' ').trim();

          switch (cmd.toLowerCase()) {
            case '/help':
              console.log('');
              console.log(`${C.bold}${C.snow}Доступные команды FROST CLI (всё работает в одном окне):${C.reset}`);
              console.log(`  ${C.cyan}Shift+Tab${C.reset}       ${C.dimText}— Быстрое переключение модели (или F2 / /model)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+Tab${C.reset}        ${C.dimText}— Переключение мощности (High / Med / Fast или Ctrl+P / /power)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+T${C.reset}          ${C.dimText}— Создать новую вкладку чата (или /new)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+W${C.reset}          ${C.dimText}— Закрыть текущую вкладку (или /close)${C.reset}`);
              console.log(`  ${C.cyan}Alt+1..9${C.reset}        ${C.dimText}— Мгновенный переход на вкладку 1..9 (или F6/F7)${C.reset}`);
              console.log(`  ${C.cyan}/tab [1-9]${C.reset}      ${C.dimText}— Переключение между вкладками чатов (/tab next /tab prev)${C.reset}`);
              console.log(`  ${C.cyan}/new [имя]${C.reset}      ${C.dimText}— Создать новую вкладку с названием${C.reset}`);
              console.log(`  ${C.cyan}/close [№]${C.reset}      ${C.dimText}— Закрыть вкладку по номеру${C.reset}`);
              console.log(`  ${C.cyan}/rename <имя>${C.reset}  ${C.dimText}— Переименовать текущую вкладку чата${C.reset}`);
              console.log(`  ${C.cyan}/tabs${C.reset}           ${C.dimText}— Список всех открытых вкладок чатов${C.reset}`);
              console.log(`  ${C.cyan}/power [1-3]${C.reset}    ${C.dimText}— Выбор уровня мощности модели${C.reset}`);
              console.log(`  ${C.cyan}/model [имя]${C.reset}    ${C.dimText}— Просмотр или переключение модели${C.reset}`);
              console.log(`  ${C.cyan}/plan <задача>${C.reset}  ${C.dimText}— Архитектурный план с автономным исполнением${C.reset}`);
              console.log(`  ${C.cyan}/tokens${C.reset}         ${C.dimText}— Интерактивный список токенов прямо в чате${C.reset}`);
              console.log(`  ${C.cyan}/token <№>${C.reset}     ${C.dimText}— Переключение токена по номеру${C.reset}`);
              console.log(`  ${C.cyan}/stats${C.reset}          ${C.dimText}— Баланс токенов с прогресс-баром${C.reset}`);
              console.log(`  ${C.cyan}/web${C.reset}            ${C.dimText}— Проверить DSH Web (http://127.0.0.1:3080)${C.reset}`);
              console.log(`  ${C.cyan}/clear${C.reset}          ${C.dimText}— Очистить текущий чат с перезапуском заставки${C.reset}`);
              if (returnToMenu) {
                console.log(`  ${C.cyan}/menu${C.reset}           ${C.dimText}— Вернуться в меню лаунчера${C.reset}`);
              }
              console.log(`  ${C.cyan}/exit${C.reset}           ${C.dimText}— Выход из программы${C.reset}`);
              console.log('');
              safePrompt();
              return;

            case '/tabs': {
              console.log(`\n${C.bold}${C.snow}Открытые вкладки чатов (${tabs.length}):${C.reset}`);
              for (let i = 0; i < tabs.length; i++) {
                const t = tabs[i];
                const isCur = (i === activeTabIdx);
                const mark = isCur ? `${C.green}● ${C.bold}` : `  ${C.dimGray}`;
                console.log(`${mark}[${i + 1}] ${t.title}${C.reset} · ${C.cyan}${t.model}${C.reset} · ${C.yellow}[${POWER_MODES[t.powerIdx].label}]${C.reset} · ${C.dimText}${t.history.length} сообщений${C.reset}`);
              }
              console.log(`\n${C.dimText}Переключение: /tab <№>, Alt+1..9, F6/F7 | Создать: /new | Закрыть: /close${C.reset}\n`);
              safePrompt();
              return;
            }

            case '/tab':
            case '/t': {
              if (!argStr) {
                console.log(`${C.yellow}Укажите номер вкладки: /tab <1-${tabs.length}> или next/prev${C.reset}\n`);
                safePrompt();
                return;
              }
              const clean = argStr.toLowerCase();
              if (clean === 'next' || clean === 'n') {
                switchTab((activeTabIdx + 1) % tabs.length);
                return;
              }
              if (clean === 'prev' || clean === 'p') {
                switchTab((activeTabIdx - 1 + tabs.length) % tabs.length);
                return;
              }
              const num = parseInt(clean, 10);
              if (!isNaN(num) && num >= 1 && num <= tabs.length) {
                switchTab(num - 1);
                return;
              } else {
                console.log(`${C.red}✗ Вкладка #${argStr} не найдена. Всего вкладок: ${tabs.length}${C.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/new':
              createNewTab(argStr);
              return;

            case '/close': {
              let target = activeTabIdx;
              if (argStr) {
                const n = parseInt(argStr, 10);
                if (!isNaN(n) && n >= 1 && n <= tabs.length) target = n - 1;
              }
              closeCurrentTab(target);
              return;
            }

            case '/rename': {
              if (!argStr) {
                console.log(`${C.yellow}Укажите новое название: /rename <название>${C.reset}\n`);
              } else {
                getActiveTab().title = argStr.slice(0, 24);
                redrawChatView();
                return;
              }
              safePrompt();
              return;
            }

            case '/power': {
              if (argStr) {
                const clean = argStr.toLowerCase();
                let target = null;
                if (clean === '1' || clean === 'high' || clean === 'max') target = 0;
                else if (clean === '2' || clean === 'medium' || clean === 'med') target = 1;
                else if (clean === '3' || clean === 'low' || clean === 'fast') target = 2;

                if (target !== null) {
                  currentPowerIdx = target;
                  getActiveTab().powerIdx = target;
                  redrawChatView();
                  return;
                } else {
                  console.log(`${C.red}✗ Неверный режим. Доступные: 1 (High), 2 (Medium), 3 (Fast)${C.reset}\n`);
                }
              } else {
                console.log(`\n${C.bold}${C.snow}Режимы мощности модели (переключение: Ctrl+Tab или /power <№>):${C.reset}`);
                for (let i = 0; i < POWER_MODES.length; i++) {
                  const p = POWER_MODES[i];
                  const isCur = (i === currentPowerIdx);
                  const mark = isCur ? `${C.green}● ${C.bold}` : `  `;
                  console.log(`${mark}[${i + 1}] ${C.yellow}${p.label}${C.reset} — ${C.dimText}${p.desc}${C.reset}`);
                }
                console.log(`\n${C.dimText}Сочетания клавиш: Ctrl+Tab (или F3 / Ctrl+P) для мгновенной смены мощности!${C.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/tokens': {
              const store = await autoDiscoverTokens();
              console.log(`\n${C.bold}${C.snow}Сохранённые токены:${C.reset}`);
              for (let i = 0; i < store.tokens.length; i++) {
                const t = store.tokens[i];
                const isCur = (t.id === currentToken.id);
                const mark = isCur ? `${C.green}● ${C.bold}` : `  `;
                console.log(`${mark}[${i + 1}] ${t.name}${C.reset} ${C.dimText}(${maskKey(t.key)})${C.reset}`);
              }
              console.log(`\n${C.dimText}Для переключения введите: /token <номер>${C.reset}\n`);
              safePrompt();
              return;
            }

            case '/token': {
              const store = await autoDiscoverTokens();
              const idx = parseInt(argStr, 10) - 1;
              if (!isNaN(idx) && store.tokens[idx]) {
                currentToken = store.tokens[idx];
                store.activeId = currentToken.id;
                saveTokens(store);
                syncTokenToDsh(currentToken.key);
                await animateToolStep('Active Token Updated', `[${currentToken.name}] (${maskKey(currentToken.key)})`, 200);
                console.log('');
              } else {
                console.log(`${C.red}✗ Неверный номер. Введите /tokens для списка токенов.${C.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/model':
              if (argStr) {
                let found = null;
                const num = parseInt(argStr, 10);
                if (!isNaN(num) && availableModels[num - 1]) {
                  found = availableModels[num - 1];
                } else {
                  found = availableModels.find(m => m.toLowerCase().includes(argStr.toLowerCase()));
                }

                if (found) {
                  currentModel = found;
                  getActiveTab().model = found;
                  redrawChatView();
                  return;
                } else {
                  console.log(`${C.red}✗ Модель не найдена: ${argStr}${C.reset}`);
                  console.log(`${C.dimText}Доступные: ${availableModels.join(', ')}${C.reset}\n`);
                }
              } else {
                console.log(`\n${C.bold}${C.snow}Доступные модели на ключе (${availableModels.length}):${C.reset}`);
                const curM = getActiveTab().model;
                for (let i = 0; i < availableModels.length; i++) {
                  const m = availableModels[i];
                  const activeMark = (m === curM) ? `${C.green}● ${C.bold}` : `  ${C.dimGray}`;
                  console.log(`${activeMark}[${i + 1}] ${m}${C.reset}`);
                }
                console.log(`\n${C.dimText}Сменить: нажмите Shift+Tab (или F2), либо введите: /model <номер|имя>${C.reset}\n`);
              }
              safePrompt();
              return;

            case '/stats': {
              await animateToolStep('Querying Tokify Gateway', currentToken.name, 250);
              const info = await verifyKey(currentToken.key).catch(() => null);
              if (info) {
                const Q = info.quota || {};
                const U = info.usage || {};
                const L = info.limits || {};
                console.log(`\n${C.bold}${C.snow}Статистика ключа:${C.reset} ${C.ice}${info.prefix || maskKey(currentToken.key)}${C.reset} ${C.dimText}(${info.label || currentToken.name})${C.reset}`);
                if (Q.total != null) {
                  const used = Q.used || 0;
                  const total = Q.total || 1;
                  const pct = Math.min(100, (used / total) * 100).toFixed(1);
                  const color = pct >= 90 ? C.red : pct >= 70 ? C.yellow : C.green;
                  const width = 24;
                  const filled = Math.round((used / total) * width);
                  const bar = color + '█'.repeat(filled) + C.darkLine + '·'.repeat(width - filled) + C.reset;
                  console.log(`  Пакет токенов:   [${bar}] ${color}${pct}%${C.reset} · остаток ${C.bold}${fmtTok(Q.remaining ?? 0)}${C.reset} из ${fmtTok(total)}`);
                } else {
                  console.log(`  Пакет токенов:   ${C.dimText}безлимит${C.reset}`);
                }
                if (L.rpm) console.log(`  RPM лимит:       ${C.dimText}${L.rpm} зап/мин${C.reset}`);
                if (L.rpd) console.log(`  RPD сегодня:     ${C.dimText}${U.today_requests || 0}/${L.rpd}${C.reset}`);
                console.log(`  Всего запросов:  ${C.dimText}${(U.total_requests || 0).toLocaleString()} · токенов: ${fmtTok(U.total_tokens || 0)}${C.reset}\n`);
              } else {
                console.log(`${C.red}✗ Не удалось загрузить статистику${C.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/web': {
              const alive = await isDshWebAlive();
              if (alive) {
                console.log(`\n${C.green}● DSH Web активен в фоне:${C.reset} ${C.cyan}http://127.0.0.1:3080/${C.reset}`);
              } else {
                await animateToolStep('Starting DSH Web in background', 'port 3080', 400);
                await ensureDshWebSilent();
                console.log(`${C.green}● DSH Web запущен в фоне:${C.reset} ${C.cyan}http://127.0.0.1:3080/${C.reset}`);
              }
              console.log('');
              safePrompt();
              return;
            }

            case '/clear':
              getActiveTab().history = [];
              await animateFrostHeader(currentToken, getActiveTab().model, keyInfo, POWER_MODES[getActiveTab().powerIdx], tabs, activeTabIdx);
              safePrompt();
              return;

            case '/exit':
            case '/quit':
              console.log(`\n${C.dimText}До встречи! 👋${C.reset}\n`);
              rl.close();
              resolve('exit');
              process.exit(0);
              return;

            case '/plan':
              break;

            default:
              console.log(`${C.red}Неизвестная команда. Введите /help для списка.${C.reset}\n`);
              safePrompt();
              return;
          }
        }

        // ── Autonomous Agent Processing with Full PC Access ──
        isBusy = true;
        rl.pause();

        const isPlan = input.startsWith('/plan');
        const userPrompt = isPlan ? input.replace(/^\/plan\s*/i, '').trim() : input;

        if (!userPrompt) {
          console.log(`${C.yellow}Укажите задачу: /plan <описание>${C.reset}\n`);
          safePrompt();
          return;
        }

        const curTab = getActiveTab();
        // Auto-title tab from the first query if name is still generic
        if (/^Чат \d+$/i.test(curTab.title)) {
          const words = userPrompt.split(/\s+/).slice(0, 4).join(' ');
          if (words.length > 0) curTab.title = words.slice(0, 18);
        }

        const curPower = POWER_MODES[curTab.powerIdx];
        const curMod = curTab.model;
        const systemInstruction =
          'You are FROST CLI 2.0, an advanced autonomous AI coding and system engineer with FULL DIRECT ACCESS to the user Windows PC. ' +
          `Operating Power Level: ${curPower.label} (${curPower.instruction}). ` +
          'You have real tools: run_powershell, write_file, read_file, list_directory. ' +
          'When the user asks you to create, modify, inspect files, or perform ANY action on their PC (e.g. creating files on Desktop, running scripts): ' +
          'YOU MUST EXECUTE YOUR TOOLS TO ACTUALLY PERFORM THE ACTION ON THE COMPUTER. ' +
          'NEVER refuse by saying you lack access. You HAVE full access through your tools. ' +
          'If the user invokes /plan, generate an exhaustive architectural plan and design document, creating any needed files on disk. ' +
          'Always respond clearly in Russian.';

        curTab.history.push({ role: 'user', content: userPrompt });
        if (curTab.history.length > 30) curTab.history = curTab.history.slice(-30);

        const messages = [
          { role: 'system', content: systemInstruction },
          ...curTab.history,
        ];

        const startTime = Date.now();
        const thinkingFrames = ['—', '\\', '|', '/'];
        const thinkingColors = [C.cyan, C.ice, C.snow, C.purple];
        let pulseIdx = 0;
        let timerId = null;

        if (isTTY) {
          timerId = setInterval(() => {
            const elapsed = formatDuration(Date.now() - startTime);
            const symbol = thinkingFrames[pulseIdx % thinkingFrames.length];
            const color  = thinkingColors[pulseIdx % thinkingColors.length];
            pulseIdx++;
            process.stdout.write(`\r\x1b[K  ${color}${symbol}${C.reset} ${C.dimText}Thought for ${elapsed}…${C.reset}`);
          }, 80);
        } else {
          process.stdout.write(`  ${C.dimText}Thought for 0s…${C.reset}\n`);
        }

        // ── Autonomous Agent Loop (Handles Tool Calls with Live Execution) ──
        let agentLoopDone = false;
        let finalResponseText = '';

        while (!agentLoopDone) {
          const completion = await callChatWithTools(messages, curMod, currentToken.key, curPower);
          const choice = completion.choices?.[0];

          if (!choice) throw new Error('Empty response from model API');

          // If model wants to execute system tools on the PC:
          if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
            if (timerId) { clearInterval(timerId); timerId = null; }
            if (isTTY) process.stdout.write('\r\x1b[K');

            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`  ${C.cyan}●${C.reset} ${C.dimText}Thought for ${elapsed} (Analyzing system state and executing operations...)${C.reset}`);

            messages.push(choice.message);

            for (const tc of choice.message.tool_calls) {
              const fnName = tc.function.name;
              let fnArgs = {};
              try { fnArgs = JSON.parse(tc.function.arguments); } catch {}

              let actionDisplay = fnName;
              let detailDisplay = '';
              if (fnName === 'run_powershell') {
                actionDisplay = `Ran (${fnArgs.command?.slice(0, 75) || 'powershell'})`;
              } else if (fnName === 'write_file') {
                actionDisplay = `Created file (${path.basename(fnArgs.path || 'file')})`;
                detailDisplay = `(${fnArgs.path})`;
              } else if (fnName === 'read_file') {
                actionDisplay = `Read file (${path.basename(fnArgs.path || 'file')})`;
              } else if (fnName === 'list_directory') {
                actionDisplay = `Inspected directory (${fnArgs.path || '.'})`;
              }

              // Animate the tool execution badge!
              await animateToolStep(actionDisplay, detailDisplay, 250);

              // Execute tool on Windows PC!
              const toolResult = executeSystemTool(fnName, fnArgs);

              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: String(toolResult),
              });
            }

            console.log(`  ${C.cyan}●${C.reset} ${C.dimText}Thought for 4s${C.reset}\n`);
            // Continue agent loop with tool results!
            continue;
          }

          // When no more tool calls: model returned final answer
          if (timerId) { clearInterval(timerId); timerId = null; }
          if (isTTY) process.stdout.write('\r\x1b[K');

          if (!finalResponseText && messages.length === curTab.history.length + 1) {
            const elapsed = formatDuration(Date.now() - startTime);
            console.log(`  ${C.cyan}●${C.reset} ${C.dimText}Thought for ${elapsed} (Direct analysis completed)${C.reset}\n`);
          }

          finalResponseText = choice.message?.content || '';
          agentLoopDone = true;
        }

        // Print final response text cleanly
        console.log(finalResponseText);
        console.log('');

        if (finalResponseText) {
          curTab.history.push({ role: 'assistant', content: finalResponseText });
        }

      } catch (err) {
        if (timerId) clearInterval(timerId);
        if (isTTY) process.stdout.write('\r\x1b[K');
        console.log(`\n  ${C.red}✗ Ошибка API: ${err.message}${C.reset}\n`);
        const curTab = getActiveTab();
        if (curTab && curTab.history.length > 0) curTab.history.pop();
      } finally {
        isBusy = false;
        console.log('');
        safePrompt();
      }
    });

    rl.on('close', async () => {
      while (isBusy) {
        await sleep(80);
      }
      resolve('close');
    });
  });
}

// ── Interactive Single-Window Launcher Menu ──
function renderBanner(activeToken, webActive) {
  console.clear();
  const webMark = webActive ? chalk.green('● Активен в фоне (3080)') : chalk.yellow('○ Не запущен');
  const tokMark = activeToken
    ? `${chalk.green('●')} ${chalk.bold(activeToken.name)} ${chalk.dim(`(${maskKey(activeToken.key)})`)}`
    : chalk.red('○ Не выбран');

  console.log(boxen(
    `${chalk.cyan.bold('  FROST CLI 2.0 · Autonomous Agent with Full PC Access  ')}\n\n` +
    `  ${chalk.dim('Активный токен:')} ${tokMark}\n` +
    `  ${chalk.dim('DSH Web статус:')} ${webMark}\n` +
    `  ${chalk.dim('Доступ к ПК:')}    ${chalk.green('ПОЛНЫЙ ДОСТУП (PowerShell, файлы, рабочий стол)')}\n` +
    `  ${chalk.dim('Режим работы:')}   ${chalk.green('Одно окно (без всплывающих окон)')}`,
    { padding: 1, margin: { top: 1, bottom: 1, left: 1, right: 1 }, borderStyle: 'round', borderColor: 'cyan' }
  ));
}

async function pause() {
  try {
    await inquirer.prompt([{ type: 'input', name: '_', message: chalk.dim('Нажмите Enter для продолжения…') }]);
  } catch {}
}

async function menuLoop() {
  ensureDshWebSilent();

  for (;;) {
    const data = await autoDiscoverTokens();
    const active = data.tokens.find(t => t.id === data.activeId);
    const webActive = await isDshWebAlive();

    renderBanner(active, webActive);

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Что делаем (всё работает в одном окне):',
      pageSize: 15,
      choices: [
        { name: '🚀  [1] Запустить FROST CLI Чат (прямо здесь)', value: '1click' },
        { name: '🔑  [2] Выбрать токен из сохранённых', value: 'select' },
        { name: '➕  [3] Добавить новый API токен (sk-…)', value: 'add' },
        new inquirer.Separator(),
        { name: '⚡  [4] Запустить funpay-setup.cjs', value: 'funpay' },
        { name: '🌐  [5] Проверить фоновый DSH Web (3080)', value: 'web' },
        { name: '📊  [6] Статистика токена и баланс', value: 'stats' },
        { name: '📋  [7] Список доступных моделей', value: 'models' },
        new inquirer.Separator(),
        { name: '❌  [0] Выход', value: 'exit' },
      ],
    }]);

    switch (action) {
      case '1click': {
        if (!active) {
          console.log(chalk.red('\n  ✗ Сначала добавьте токен!\n'));
          await pause();
          break;
        }
        syncDshSettingsFull(active.key);
        await runChat({ tokenId: active.id, returnToMenu: true });
        break;
      }

      case 'select': {
        if (!data.tokens.length) {
          console.log(chalk.yellow('\n  Список токенов пуст. Добавьте новый токен.\n'));
          await pause();
          break;
        }
        const spin = ora('Проверяю балансы токенов…').start();
        const enriched = await Promise.all(data.tokens.map(async (t) => {
          const info = await verifyKey(t.key).catch(() => null);
          return { ...t, info };
        }));
        spin.stop();

        const choices = enriched.map((t, idx) => {
          const isAct = (t.id === data.activeId);
          const prefix = isAct ? chalk.green('● ') : '  ';
          const rem = t.info?.quota?.remaining != null ? chalk.cyan(` [остаток: ${fmtTok(t.info.quota.remaining)}]`) : '';
          const label = t.info?.label ? chalk.dim(` (${t.info.label})`) : '';
          return {
            name: `${prefix}[${idx + 1}] ${chalk.bold(t.name)} ${chalk.dim(maskKey(t.key))}${rem}${label}`,
            value: t.id,
          };
        });
        choices.push(new inquirer.Separator(), { name: '↩ Назад', value: 'back' });

        const { chosenId } = await inquirer.prompt([{
          type: 'list', name: 'chosenId', message: 'Выберите токен:', pageSize: 15, choices,
        }]);

        if (chosenId !== 'back') {
          data.activeId = chosenId;
          saveTokens(data);
          const selected = data.tokens.find(t => t.id === chosenId);
          syncDshSettingsFull(selected.key);
          console.log(chalk.green(`\n  ✓ Активным выбран: ${chalk.bold(selected.name)}\n`));

          const { launchNow } = await inquirer.prompt([{
            type: 'confirm', name: 'launchNow', message: 'Открыть FROST CLI прямо сейчас?', default: true,
          }]);
          if (launchNow) {
            await runChat({ tokenId: selected.id, returnToMenu: true });
          }
        }
        break;
      }

      case 'add': {
        const { key } = await inquirer.prompt([{
          type: 'password', name: 'key', message: 'Введите API-ключ Tokify / FunPay (sk-…):', mask: '*',
          validate: (v) => v?.trim().startsWith('sk-') || 'Ключ должен начинаться с sk-',
        }]);

        const cleanKey = key.trim();
        const spin = ora('Проверяю ключ на tokify.sale…').start();
        let info;
        try {
          info = await verifyKey(cleanKey);
          spin.succeed(`Ключ действителен! ${info.label || ''} (Остаток: ${fmtTok(info.quota?.remaining)})`);
        } catch (e) {
          spin.fail(`Ошибка ключа: ${e.message}`);
          await pause();
          break;
        }

        const defaultName = info.label || `Токен ${maskKey(cleanKey)}`;
        const { name } = await inquirer.prompt([{
          type: 'input', name: 'name', message: 'Название токена:', default: defaultName,
        }]);

        const id = 'key_' + Math.random().toString(36).slice(2, 8);
        data.tokens.push({ id, name, key: cleanKey });
        data.activeId = id;
        saveTokens(data);
        syncDshSettingsFull(cleanKey);
        console.log(chalk.green(`\n  ✓ Токен сохранён и установлен как активный!\n`));

        const { launchNow } = await inquirer.prompt([{
          type: 'confirm', name: 'launchNow', message: 'Открыть FROST CLI прямо сейчас?', default: true,
        }]);
        if (launchNow) {
          await runChat({ tokenId: id, returnToMenu: true });
        }
        break;
      }

      case 'funpay': {
        console.log(chalk.cyan('\n  ⚡ Запуск funpay-setup.cjs…\n'));
        try {
          const setupFile = path.join(HOME, 'funpay-setup.cjs');
          if (!fs.existsSync(setupFile)) {
            const spin = ora('Скачиваю funpay-setup.cjs…').start();
            execSync(`powershell -ExecutionPolicy Bypass -Command "irm https://tokify.sale/check/funpay-setup.cjs -OutFile '${setupFile}'"`, { stdio: 'ignore' });
            spin.succeed('Скачано!');
          }
          execSync(`node "${setupFile}"`, { stdio: 'inherit' });
          await autoDiscoverTokens();
        } catch (e) {
          console.log(chalk.red(`  Ошибка выполнения: ${e.message}`));
        }
        await pause();
        break;
      }

      case 'web': {
        const spin = ora('Проверяю DSH Web…').start();
        await ensureDshWebSilent();
        const alive = await isDshWebAlive();
        if (alive) {
          spin.succeed(`DSH Web работает в фоне: ${chalk.cyan('http://127.0.0.1:3080/')}`);
        } else {
          spin.warn('DSH Web запускается…');
        }
        console.log(chalk.dim('  (Веб-интерфейс работает скрыто как фоновый демон)\n'));
        await pause();
        break;
      }

      case 'stats': {
        if (!active) { console.log(chalk.red('\n  ✗ Нет активного токена!\n')); await pause(); break; }
        const spin = ora('Загружаю статистику…').start();
        try {
          const info = await verifyKey(active.key);
          spin.succeed('Готово');
          const Q = info.quota || {};
          const U = info.usage || {};
          const L = info.limits || {};

          const prefix = info.prefix || maskKey(active.key);
          console.log(chalk.bold('\n  Токен: ') + chalk.cyan(prefix) + chalk.dim(` (${info.label || active.name})`));
          if (Q.total != null) {
            const used = Q.used || 0;
            const total = Q.total || 1;
            const pct = Math.min(100, (used / total) * 100).toFixed(1);
            const color = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
            const width = 24;
            const filled = Math.min(width, Math.max(0, Math.round((used / total) * width)));
            const bar = chalk[color]('█'.repeat(filled)) + chalk.gray('·'.repeat(width - filled));
            console.log(`  Пакет токенов:   [${bar}] ${chalk[color](pct + '%')} · остаток ${chalk.bold(fmtTok(Q.remaining ?? 0))} из ${fmtTok(total)}`);
          } else {
            console.log('  Пакет токенов:   ' + chalk.dim('безлимит'));
          }
          if (L.rpm) console.log(chalk.dim(`  RPM лимит:       ${L.rpm} запросов/мин`));
          if (L.rpd) console.log(chalk.dim(`  RPD лимит:       ${U.today_requests || 0}/${L.rpd} сегодня`));
          console.log(chalk.dim(`  Всего запросов:  ${(U.total_requests || 0).toLocaleString()} · использовано токенов: ${fmtTok(U.total_tokens || 0)}`));
        } catch (e) {
          spin.fail(e.message);
        }
        await pause();
        break;
      }

      case 'models': {
        if (!active) { console.log(chalk.red('\n  ✗ Нет активного токена!\n')); await pause(); break; }
        const spin = ora('Загружаю каталог моделей…').start();
        const models = await fetchModels(active.key);
        if (!models?.length) { spin.fail('Не удалось получить список моделей'); await pause(); break; }
        spin.succeed(`Найдено ${models.length} моделей`);

        const tbl = new Table({ head: ['Модель'], style: { head: ['cyan'] } });
        for (const m of models) tbl.push([chalk.bold(m)]);
        console.log('\n' + tbl.toString() + '\n');
        await pause();
        break;
      }

      case 'exit':
        console.log(chalk.dim('\n  До встречи! 👋\n'));
        process.exit(0);
    }
  }
}

// ── Entrypoint Dispatcher ──
(async () => {
  const argv = process.argv.slice(2);
  if (argv.includes('chat') || argv.includes('--chat') || argv.some(a => a.startsWith('/plan'))) {
    await runChat({ returnToMenu: false });
    process.exit(0);
  } else {
    await menuLoop();
  }
})().catch(e => {
  console.error('Ошибка:', e.message || e);
  process.exit(1);
});
