#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  tokify. — Autonomous AI Agent with Full PC Access
 *  OpenCode-inspired Terminal User Interface
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

const SAFE_SPINNER = { interval: 80, frames: ['—', '\\', '|', '/'] };
function ora(opts) {
  if (typeof opts === 'string') opts = { text: opts };
  return oraLib({ spinner: SAFE_SPINNER, ...opts });
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
const bgRgb = (r, g, b) => isTTY ? `\x1b[48;2;${r};${g};${b}m` : '';

// ─── Theme Palettes (Cyber, Crimson, Emerald, Purple, Amber, Mono) ───
const THEMES = {
  cyber: {
    id: 'cyber',
    name: 'Cyber Ice (Cyan & Electric)',
    barCyan: rgb(56, 139, 253),
    accentBlue: rgb(56, 139, 253),
    secondary: rgb(121, 192, 255),
    peach: rgb(240, 147, 91),
    bgCard: bgRgb(24, 24, 27),
    bgTabActive: bgRgb(34, 34, 39),
    bgModal: bgRgb(20, 20, 23),
    bgSelected: bgRgb(56, 139, 253),
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Blood (Dark Red)',
    barCyan: rgb(239, 68, 68),
    accentBlue: rgb(239, 68, 68),
    secondary: rgb(248, 113, 113),
    peach: rgb(185, 28, 28),
    bgCard: bgRgb(28, 20, 22),
    bgTabActive: bgRgb(42, 26, 30),
    bgModal: bgRgb(24, 18, 20),
    bgSelected: bgRgb(220, 38, 38),
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Matrix (Neon Green)',
    barCyan: rgb(16, 185, 129),
    accentBlue: rgb(16, 185, 129),
    secondary: rgb(52, 211, 153),
    peach: rgb(5, 150, 105),
    bgCard: bgRgb(20, 27, 24),
    bgTabActive: bgRgb(26, 38, 32),
    bgModal: bgRgb(18, 24, 20),
    bgSelected: bgRgb(16, 185, 129),
  },
  purple: {
    id: 'purple',
    name: 'Violet Void (Amethyst)',
    barCyan: rgb(168, 85, 247),
    accentBlue: rgb(168, 85, 247),
    secondary: rgb(192, 132, 252),
    peach: rgb(244, 114, 182),
    bgCard: bgRgb(25, 20, 30),
    bgTabActive: bgRgb(36, 28, 44),
    bgModal: bgRgb(22, 18, 26),
    bgSelected: bgRgb(168, 85, 247),
  },
  amber: {
    id: 'amber',
    name: 'Amber Solar (Gold & Orange)',
    barCyan: rgb(245, 158, 11),
    accentBlue: rgb(245, 158, 11),
    secondary: rgb(251, 191, 36),
    peach: rgb(234, 88, 12),
    bgCard: bgRgb(28, 24, 20),
    bgTabActive: bgRgb(42, 34, 26),
    bgModal: bgRgb(24, 20, 18),
    bgSelected: bgRgb(245, 158, 11),
  },
  mono: {
    id: 'mono',
    name: 'Monochrome (Minimal Silver)',
    barCyan: rgb(226, 232, 240),
    accentBlue: rgb(226, 232, 240),
    secondary: rgb(148, 163, 184),
    peach: rgb(203, 213, 225),
    bgCard: bgRgb(26, 26, 26),
    bgTabActive: bgRgb(40, 40, 40),
    bgModal: bgRgb(22, 22, 22),
    bgSelected: bgRgb(226, 232, 240),
  },
};

let currentThemeId = 'cyber';
let currentAccessMode = 'turbo'; // 'turbo' | 'review'

const SETTINGS_FILE = path.join(os.homedir(), '.tokify-settings.json');

function saveUserSettings() {
  try {
    const data = { theme: currentThemeId, accessMode: currentAccessMode };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

const OC = {
  reset:  isTTY ? '\x1b[0m' : '',
  bold:   isTTY ? '\x1b[1m' : '',
  dim:    isTTY ? '\x1b[2m' : '',
  bgCard:      bgRgb(24, 24, 27),
  bgTabActive: bgRgb(34, 34, 39),
  bgModal:     bgRgb(20, 20, 23),
  bgSelected:  bgRgb(56, 139, 253),
  fgBlack:     rgb(0, 0, 0),
  barCyan:     rgb(56, 139, 253),
  accentBlue:  rgb(56, 139, 253),
  textWhite:   rgb(240, 246, 252),
  textMuted:   rgb(139, 148, 158),
  textDim:     rgb(110, 118, 129),
  catViolet:   rgb(147, 130, 255),
  peach:       rgb(240, 147, 91),
  green:       rgb(52, 211, 153),
  red:         rgb(248, 113, 113),
  yellow:      rgb(234, 179, 8),
  cyan:        rgb(56, 139, 253),
  snow:        rgb(240, 246, 252),
  dimText:     rgb(110, 118, 129),
  ice:         rgb(121, 192, 255),
  darkLine:    rgb(40, 45, 55),
};

const C = OC;

let BAR = OC.barCyan + '▌' + OC.reset;

function applyTheme(themeId, save = true) {
  if (!THEMES[themeId]) themeId = 'cyber';
  currentThemeId = themeId;
  const t = THEMES[themeId];
  OC.barCyan    = t.barCyan;
  OC.accentBlue = t.accentBlue;
  OC.peach      = t.peach;
  OC.bgCard     = t.bgCard;
  OC.bgTabActive= t.bgTabActive;
  OC.bgModal    = t.bgModal;
  OC.bgSelected = t.bgSelected;
  OC.cyan       = t.barCyan;
  OC.ice        = t.secondary;
  BAR = OC.barCyan + '▌' + OC.reset;
  if (save) saveUserSettings();
}

function loadUserSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (data.theme && THEMES[data.theme]) applyTheme(data.theme, false);
      if (data.accessMode === 'review' || data.accessMode === 'turbo') currentAccessMode = data.accessMode;
    }
  } catch {}
}

loadUserSettings();

// Clipboard helper for Ctrl+V
function getClipboardText() {
  try {
    return execSync('powershell.exe -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Clipboard"', {
      timeout: 2000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
  } catch {
    return '';
  }
}

// ─── tokify. Block Logo (Prominent OpenCode silver→white horizontal gradient) ───
const TOKIFY_LOGO = [
  '  ████████╗ ██████╗ ██╗  ██╗██╗███████╗██╗   ██╗     ',
  '  ╚══██╔══╝██╔═══██╗██║ ██╔╝██║██╔════╝╚██╗ ██╔╝     ',
  '     ██║   ██║   ██║█████╔╝ ██║█████╗   ╚████╔╝      ',
  '     ██║   ██║   ██║██╔═██╗ ██║██╔══╝    ╚██╔╝       ',
  '     ██║   ╚██████╔╝██║  ██╗██║██║        ██║     ██╗',
  '     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝     ╚═╝',
];

function renderLogoLines() {
  const lines = [];
  for (const line of TOKIFY_LOGO) {
    let out = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === ' ') { out += ' '; continue; }
      const t = c / line.length;
      const val = Math.round(110 + (255 - 110) * t);
      out += rgb(val, val, Math.min(255, val + 15)) + ch + OC.reset;
    }
    lines.push(out);
  }
  return lines;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

// ── Keyboard Shortcut Helpers ──
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
    return s === '\x1b[1;5I' || s === '\x1b[27;5;9~' || s === '\x1b[9;5u' || s === '\x1b[I';
  }
  if (key.shift) return false;
  if (key.name === 'tab') return true;
  if (s === '\t') return true;
  if (key.sequence === '\x1b[1;5I' || key.sequence === '\x1b[27;5;9~' || key.sequence === '\x1b[9;5u' || key.sequence === '\x1b[I') return true;
  if (key.ctrl && (key.sequence === '\t' || key.name === 'i')) return true;
  if (key.name === 'f3') return true;
  return false;
}


// ── Stealth Background DSH Web Daemon ──
function getNodeExecutable() {
  const candidates = [
    'node', 'node.exe',
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
        const child = spawn(nodeExe, [dshBin, 'web', '--no-open'], {
          detached: true, stdio: 'ignore', windowsHide: true, shell: false,
        });
        child.unref();
      } else {
        const psCmd = `Start-Process -FilePath 'cmd.exe' -ArgumentList '/c dsh web --no-open' -WindowStyle Hidden`;
        const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psCmd], {
          detached: true, stdio: 'ignore', windowsHide: true, shell: false,
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
// FULL PC ACCESS: SYSTEM AGENT TOOLS
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
          command: { type: 'string', description: 'The exact PowerShell command line to execute on the system' },
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
          path: { type: 'string', description: 'The file path (e.g. C:\\Users\\...\\Desktop\\file.txt)' },
          content: { type: 'string', description: 'The full text content to write into the file' },
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
          path: { type: 'string', description: 'The path of the file to read' },
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
          path: { type: 'string', description: 'The directory path to inspect' },
        },
        required: [],
      },
    },
  },
];

function decodeCP866(buf) {
  if (!buf) return '';
  if (typeof buf === 'string') buf = Buffer.from(buf, 'binary');
  let str = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x80) {
      str += String.fromCharCode(b);
    } else if (b >= 0x80 && b <= 0xAF) {
      str += String.fromCharCode(0x0410 + (b - 0x80)); // А-п
    } else if (b >= 0xE0 && b <= 0xEF) {
      str += String.fromCharCode(0x0440 + (b - 0xE0)); // р-я
    } else if (b === 0xF0) {
      str += 'Ё';
    } else if (b === 0xF1) {
      str += 'ё';
    } else {
      str += String.fromCharCode(b);
    }
  }
  return str;
}

function cleanCLIXML(raw) {
  if (!raw || !raw.includes('#< CLIXML')) return raw;
  const matches = raw.match(/<S S="Error">(.*?)<\/S>/gs);
  if (matches) {
    return matches
      .map(m => m.replace(/<\/?S[^>]*>/g, '').replace(/_x000D__x000A_/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
      .join('');
  }
  return raw.replace(/<[^>]+>/g, '').replace(/_x000D__x000A_/g, '\n');
}

function executeSystemTool(name, args) {
  if (name === 'run_powershell') {
    try {
      const cmd = args.command || '';
      const fullScript = `
$ProgressPreference = 'SilentlyContinue';
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
$OutputEncoding = [System.Text.Encoding]::UTF8;
try {
  & {
${cmd}
  } 2>&1 | Out-String
} catch {
  $_ | Out-String
}
`;
      const b64 = Buffer.from(fullScript, 'utf16le').toString('base64');
      const res = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000,
      });
      return res.trim() || '(command completed successfully with no output)';
    } catch (e) {
      let errText = '';
      if (e.stderr && e.stderr.length > 0) {
        errText = cleanCLIXML(decodeCP866(e.stderr));
      } else if (e.stdout && e.stdout.length > 0) {
        errText = e.stdout.toString('utf8');
      } else {
        errText = e.message;
      }
      return `PowerShell Error:\n${errText.trim()}`;
    }
  }

  if (name === 'write_file') {
    try {
      let targetPath = args.path;
      if (targetPath.startsWith('~')) targetPath = path.join(HOME, targetPath.slice(1));
      targetPath = path.resolve(targetPath);
      ensureDir(path.dirname(targetPath));
      let content = args.content || '';
      // Prepend UTF-8 BOM on Windows for .ps1 files so PowerShell 5.1 parses Cyrillic/Unicode cleanly
      if (targetPath.endsWith('.ps1') && !content.startsWith('\uFEFF')) {
        content = '\uFEFF' + content;
      }
      fs.writeFileSync(targetPath, content, 'utf8');
      return `File written successfully to ${targetPath} (${content.length} characters)`;
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
      let content = fs.readFileSync(targetPath, 'utf8');
      if (content.startsWith('\uFEFF')) content = content.slice(1);
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

// ── Chat API ──
async function* streamChat(messages, model, key, tools = null, power = POWER_MODES[0]) {
  const bodyPayload = {
    model, messages, stream: true,
    max_tokens: power?.maxTokens || 16384,
  };
  if (power?.effort) bodyPayload.reasoning_effort = power.effort;
  if (tools) { bodyPayload.tools = tools; bodyPayload.tool_choice = 'auto'; }

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `HTTP error ${res.status}`;
    try { const errJson = JSON.parse(text); msg = errJson.error?.message || errJson.message || msg; } catch {}
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
      try { const parsed = JSON.parse(data); const delta = parsed.choices?.[0]?.delta; if (delta) yield delta; } catch {}
    }
  }
}

async function callChatWithTools(messages, model, key, power = POWER_MODES[0]) {
  const payload = {
    model, messages, tools: SYSTEM_TOOLS, tool_choice: 'auto',
    max_tokens: power?.maxTokens || 16384,
  };
  if (power?.effort) payload.reasoning_effort = power.effort;

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `HTTP error ${res.status}`;
    try { const errJson = JSON.parse(text); msg = errJson.error?.message || errJson.message || msg; } catch {}
    throw new Error(msg);
  }

  return await res.json();
}


// ═══════════════════════════════════════════════════════════════════════
// OPENCODE-STYLE UI RENDERERS
// ═══════════════════════════════════════════════════════════════════════

// ── Command Palette Items ──
const PALETTE_ITEMS = [
  { type: 'header', text: 'Suggested' },
  { id: 'switch_session', title: 'Switch session',      key: 'ctrl+x l' },
  { id: 'new_session',    title: 'New session',         key: 'ctrl+t / +' },
  { id: 'switch_access',  title: 'Access Mode (Review / Turbo)', key: 'ctrl+a' },
  { id: 'switch_theme',   title: 'Theme & UI Colors',   key: '' },
  { id: 'switch_model',   title: 'Switch model',        key: 'shift+tab' },
  { id: 'switch_power',   title: 'Thinking power',      key: 'tab' },
  { id: 'token_manager',  title: 'Token manager',       key: 'ctrl+x t' },
  { type: 'header', text: 'Prompt & System' },
  { id: 'view_history',   title: 'View full history',   key: '/history' },
  { id: 'stats',          title: 'Token stats / balance', key: '/stats' },
  { id: 'clear_chat',     title: 'Clear history',       key: '/clear' },
  { id: 'help',           title: 'Show help',           key: '/help' },
  { id: 'exit',           title: 'Exit tokify.',        key: '/exit' },
];

function getFilteredPaletteItems(query) {
  return PALETTE_ITEMS.filter(it => {
    if (it.type === 'header') return true;
    if (!query) return true;
    return it.title.toLowerCase().includes(query.toLowerCase());
  });
}

function getSelectablePaletteItems(query) {
  return PALETTE_ITEMS.filter(it => {
    if (it.type === 'header') return false;
    if (!query) return true;
    return it.title.toLowerCase().includes(query.toLowerCase());
  });
}

function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

// ── Markdown Lexer & Syntax Highlighter (OpenCode Style) ──
function highlightCodeLine(line, lang) {
  if (/^\s*(#|\/\/|--)/.test(line)) {
    return rgb(110, 118, 129) + line + OC.reset;
  }
  const cKeyword  = rgb(210, 168, 255); // #d2a8ff purple
  const cString   = rgb(126, 231, 135); // #7ee787 green
  const cNumber   = rgb(255, 166, 87);  // #ffa657 orange
  const cFunction = rgb(121, 192, 255); // #79c0ff light blue
  const cKey      = rgb(121, 192, 255); // #79c0ff light blue
  const cReset    = OC.reset;

  const keywords = new Set([
    'def', 'class', 'return', 'import', 'from', 'as', 'function', 'const', 'let', 'var',
    'if', 'else', 'elif', 'for', 'while', 'try', 'catch', 'except', 'finally', 'async',
    'await', 'yield', 'null', 'None', 'True', 'False', 'true', 'false', 'this', 'self',
    'new', 'typeof', 'void', 'in', 'of', 'with', 'lambda', 'pass', 'break', 'continue'
  ]);
  const builtins = new Set(['print', 'len', 'range', 'console', 'log', 'str', 'int', 'dict', 'list', 'set']);

  const tokenRegex = /(f?["'`][^"'`]*["'`]|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[^\w\s"'`]+|\s+)/g;
  let out = '';
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    const tok = match[0];
    const nextChar = line[tokenRegex.lastIndex];
    if (/^f?["'`]/.test(tok)) {
      out += cString + tok + cReset;
    } else if (/^\d+(?:\.\d+)?$/.test(tok)) {
      out += cNumber + tok + cReset;
    } else if (/^[a-zA-Z_]\w*$/.test(tok)) {
      if (keywords.has(tok)) {
        out += cKeyword + tok + cReset;
      } else if (builtins.has(tok) || nextChar === '(') {
        out += cFunction + tok + cReset;
      } else if (lang === 'json' || nextChar === ':') {
        out += cKey + tok + cReset;
      } else {
        out += tok;
      }
    } else {
      out += tok;
    }
  }
  return out;
}

function formatInlineMarkdown(text) {
  if (!text) return '';
  text = text.replace(/`([^`]+)`/g, (_, code) => rgb(121, 192, 255) + code + OC.reset);
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, (_, __, b) => '\x1b[1m\x1b[3m' + OC.textWhite + b + '\x1b[22m\x1b[23m' + OC.reset);
  text = text.replace(/(\*\*|__)(.*?)\1/g, (_, __, b) => '\x1b[1m' + OC.textWhite + b + '\x1b[22m' + OC.reset);
  text = text.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1\x1b[3m$2\x1b[23m$3');
  text = text.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1\x1b[3m$2\x1b[23m$3');
  text = text.replace(/~~(.*?)~~/g, (_, b) => '\x1b[9m' + OC.textDim + b + '\x1b[29m' + OC.reset);
  return text;
}

function renderMarkdownBlocks(content, cols) {
  cols = cols || 80;
  const lines = (content || '').split('\n');
  const out = [];
  let inCode = false;
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim().startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = l.trim().slice(3).trim();
        if (codeLang) {
          out.push('  ' + OC.textDim + codeLang + ':' + OC.reset);
        }
      } else {
        inCode = false;
        codeLang = '';
        out.push('');
      }
      continue;
    }

    if (inCode) {
      out.push('    ' + highlightCodeLine(l, codeLang));
      continue;
    }

    const hMatch = l.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      if (level <= 2) {
        out.push('\n  ' + OC.bold + OC.barCyan + formatInlineMarkdown(text) + OC.reset);
      } else {
        out.push('\n  ' + OC.bold + OC.textWhite + formatInlineMarkdown(text) + OC.reset);
      }
      continue;
    }

    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(l.trim())) {
      out.push('  ' + OC.textDim + '─'.repeat(Math.min(48, cols - 8)) + OC.reset);
      continue;
    }

    if (/^>\s*(.*)$/.test(l)) {
      const qText = l.replace(/^>\s*/, '');
      out.push('  ' + OC.barCyan + '│ ' + OC.textMuted + formatInlineMarkdown(qText) + OC.reset);
      continue;
    }

    if (/^(\s*)[-*]\s+(.+)$/.test(l)) {
      const m = l.match(/^(\s*)[-*]\s+(.+)$/);
      out.push('  ' + m[1] + OC.barCyan + '• ' + OC.textWhite + formatInlineMarkdown(m[2]) + OC.reset);
      continue;
    }

    if (/^(\s*)(\d+)\.\s+(.+)$/.test(l)) {
      const m = l.match(/^(\s*)(\d+)\.\s+(.+)$/);
      out.push('  ' + m[1] + OC.barCyan + m[2] + '. ' + OC.textWhite + formatInlineMarkdown(m[3]) + OC.reset);
      continue;
    }

    if (l.trim() === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
    } else {
      out.push('  ' + OC.textWhite + formatInlineMarkdown(l) + OC.reset);
    }
  }

  return out;
}

// ── Smooth Running Shimmer Beam with Glowing Trail ──
function renderShimmerBeam(width = 16, pos = 0) {
  const trail = [
    [20, 45, 90],
    [30, 80, 160],
    [56, 139, 253],
    [100, 185, 255],
    [240, 246, 252], // Radiant white core
    [100, 185, 255],
    [56, 139, 253],
    [30, 80, 160],
    [20, 45, 90],
  ];

  let out = '';
  for (let i = 0; i < width; i++) {
    const dist = i - pos;
    const trailIdx = dist + 4;
    if (trailIdx >= 0 && trailIdx < trail.length) {
      const c = trail[trailIdx];
      out += rgb(c[0], c[1], c[2]) + '█' + OC.reset;
    } else {
      out += rgb(40, 45, 55) + '·' + OC.reset;
    }
  }
  return out;
}

// ── Global Tab Click Tracking Zones (for Mouse Clicks) ──
let tabZones = [];
let plusZone = { startX: 0, endX: 0 };

function renderTabBar(tabs, activeTabIdx) {
  tabZones = [];
  let tabLine = ' ';
  let curX = 1;

  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    const isAct = (i === activeTabIdx);
    const startX = curX;
    let seg = '';
    if (isAct) {
      seg = ' ● ' + t.title + ' ';
      tabLine += OC.bgTabActive + ' ● ' + OC.textWhite + t.title + ' ' + OC.reset + ' ';
    } else {
      seg = '   ' + t.title + '  ';
      tabLine += OC.textDim + seg + OC.reset;
    }
    curX += seg.length;
    tabZones.push({ idx: i, startX, endX: curX });
  }

  const plusStart = curX;
  const plusSeg = '+ ';
  tabLine += OC.bgTabActive + OC.peach + OC.bold + plusSeg + OC.reset;
  plusZone = { startX: plusStart, endX: plusStart + plusSeg.length + 4 };
  return tabLine;
}

// ── Smooth Cinematic Intro Animation on Startup ──
async function playStartupAnimation() {
  if (!isTTY) return;
  const cols = Math.min(process.stdout.columns || 90, 100);
  const rows = process.stdout.rows || 25;
  const rawLogoW = TOKIFY_LOGO[0].length;
  const logoPad = ' '.repeat(Math.max(2, Math.floor((cols - rawLogoW) / 2)));
  const topPad = Math.max(1, Math.floor(rows * 0.12));

  // 24 frames at ~22ms ≈ 520ms total
  const totalFrames = 24;
  for (let f = 0; f <= totalFrames; f++) {
    const sweepX = (f / totalFrames) * (rawLogoW + 14) - 7;
    let out = '\x1b[H\x1b[2J';
    for (let i = 0; i < topPad; i++) out += '\n';

    for (const line of TOKIFY_LOGO) {
      out += logoPad;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === ' ') { out += ' '; continue; }
        const dist = Math.abs(c - sweepX);
        if (dist < 2) {
          out += OC.textWhite + ch + OC.reset; // Radiant peak
        } else if (dist < 5) {
          out += OC.barCyan + ch + OC.reset; // Cyan glow
        } else if (dist < 8) {
          out += OC.accentBlue + ch + OC.reset; // Deep blue
        } else if (c < sweepX) {
          // Settled state (sleek gradient)
          const t = c / line.length;
          const v = Math.round(180 + t * 65);
          out += rgb(v, v, Math.min(255, v + 12)) + ch + OC.reset;
        } else {
          // Unignited state
          out += rgb(42, 46, 56) + ch + OC.reset;
        }
      }
      out += '\n';
    }

    const pct = Math.min(100, Math.round((f / totalFrames) * 100));
    const barWidth = 24;
    const filled = Math.round((pct / 100) * barWidth);
    const beam = OC.barCyan + '█'.repeat(filled) + rgb(45, 50, 60) + '·'.repeat(barWidth - filled) + OC.reset;
    const subText = `${OC.textDim}INITIALIZING TOKIFY KERNEL 2.0...${OC.reset}  [${beam}] ${OC.barCyan}${pct}%${OC.reset}`;
    const subPad = ' '.repeat(Math.max(2, Math.floor((cols - 56) / 2)));
    out += '\n' + subPad + subText + '\n';

    process.stdout.write(out);
    await sleep(22);
  }

  await sleep(100);
}

// ── Render: OpenCode Home Screen ──
function renderOpenCodeHome(currentModel, currentPower, cwd, tabs = [{ title: 'New session' }], activeTabIdx = 0) {
  const cols = Math.min(process.stdout.columns || 90, 100);
  const cardW = Math.max(64, cols - 8);

  process.stdout.write('\x1b[H\x1b[2J\x1b[3J');

  // 1. Tab bar at top
  console.log(renderTabBar(tabs, activeTabIdx));
  console.log('');

  // 2. Centered Prominent Logo
  const logo = renderLogoLines();
  const rawLogoW = TOKIFY_LOGO[0].length;
  const logoPad = ' '.repeat(Math.max(2, Math.floor((cols - rawLogoW) / 2)));
  for (const l of logo) console.log(logoPad + l);

  // 3. Subtext
  const subText = `${OC.peach}/help${OC.textDim} for commands · v${VERSION}${OC.reset}`;
  const subRawLen = 32;
  const subPad = ' '.repeat(Math.max(2, Math.floor((cols - subRawLen) / 2)));
  console.log('\n' + subPad + subText + '\n');

  // 4. Elevated card (Line 2: Model & Status Bar)
  const cardPad = ' '.repeat(Math.max(2, Math.floor((cols - cardW) / 2)));
  const tagLine = `Autonomous · ${currentModel} ${currentPower}`;
  const l2pad = ' '.repeat(Math.max(1, cardW - 4 - tagLine.length));

  console.log(cardPad + OC.bgCard + ' ' + BAR + ' ' +
    OC.accentBlue + 'Autonomous' + OC.textMuted + ' · ' +
    OC.textWhite + currentModel + ' ' +
    OC.peach + currentPower + OC.bgCard + l2pad + ' ' + OC.reset);

  // 5. Path and shortcuts line (clean, short, never wraps!)
  const shortCwd = cwd.length > 40 ? '...' + cwd.slice(-37) : cwd;
  const keysHint = OC.textMuted + 'shift+tab' + OC.textDim + ' model   ' +
                   OC.textMuted + 'ctrl+p' + OC.textDim + ' commands';
  const midSpace = ' '.repeat(Math.max(2, cardW - shortCwd.length - 28));
  console.log(cardPad + ' ' + OC.textDim + shortCwd + midSpace + keysHint + OC.reset);
  console.log('');

  // 6. Footer (solid ● bullets)
  const footLeft = ' ' + OC.green + '●' + OC.textMuted + ' Full PC Access   ' +
                   OC.accentBlue + '●' + OC.textMuted + ' 1 MCP';
  const footRight = OC.textDim + VERSION + ' ';
  const footSpace = ' '.repeat(Math.max(2, cols - 32 - VERSION.length - 2));
  console.log(footLeft + footSpace + footRight + OC.reset);
  console.log('');
}

// ── Render: OpenCode Chat Screen (with Persistent Pinned Tab Bar & Strictly Clamped Viewport) ──
function renderOpenCodeChat(tabs, activeTabIdx, history, currentModel, currentPower, isBusy, cwd = '', activeSteps = []) {
  const cols = Math.min(process.stdout.columns || 90, 140);
  const rows = process.stdout.rows || 30;
  const cardW = Math.max(50, cols - 6);

  // Clear visible screen & reset scrollback so Row 1 is ALWAYS pinned at the top
  process.stdout.write('\x1b[H\x1b[2J\x1b[3J');

  // Format chat messages into lines
  const chatLines = [];

  for (let idx = 0; idx < history.length; idx++) {
    const m = history[idx];
    if (m.role === 'user') {
      const content = m.content || '';
      const padLen = Math.max(1, cardW - 4 - stripAnsi(content).length);
      chatLines.push(' ' + OC.bgCard + ' ' + BAR + ' ' + OC.textWhite + content + OC.bgCard + ' '.repeat(padLen) + ' ' + OC.reset);
      chatLines.push('');
    } else if (m.role === 'assistant') {
      const thoughtDur = m.thought || m.duration || '2s';
      chatLines.push('  ' + OC.textDim + '+ Thought · ' + thoughtDur + OC.reset);

      const blocks = renderMarkdownBlocks(m.content, cardW);
      for (const b of blocks) {
        chatLines.push(b);
      }

      const dur = m.duration || '2.8s';
      const spd = m.speed || '38.4 tok/s';
      const meta = '  ' + OC.barCyan + 'Autonomous' + OC.textDim + ' · ' +
        OC.textWhite + (m.model || currentModel) + ' ' + (m.power || currentPower) + OC.textDim +
        ' · ' + dur + ' · ' + spd + OC.reset;
      chatLines.push(meta);
      chatLines.push('');
    }
  }

  // If live tool steps are active during autonomous execution, render them cleanly
  if (activeSteps && activeSteps.length > 0) {
    for (const step of activeSteps) {
      if (step.status === 'running') {
        chatLines.push(`  ${OC.barCyan}●${OC.reset} ${OC.textWhite}${step.action}${OC.reset} ${OC.textDim}${step.detail || ''}${OC.reset}`);
      } else {
        chatLines.push(`  ${OC.green}✔${OC.reset} ${OC.textDim}${step.action} ${step.detail || ''}${OC.reset}`);
      }
    }
  }

  // Strict height calculation: measure physical wrapped rows so total lines NEVER exceed terminal rows!
  // Reserved:
  // Row 1: Tab bar
  // Row 2: Empty line
  // Row rows - 2: Bottom status & shortcuts
  // Row rows - 1: Prompt line
  const maxChatHeight = Math.max(3, rows - 7);
  const visibleLines = [];
  let currentHeight = 0;
  for (let i = chatLines.length - 1; i >= 0; i--) {
    const line = chatLines[i];
    const rawLen = stripAnsi(line).length;
    const lineRows = Math.max(1, Math.ceil(rawLen / (cols - 2)));
    if (currentHeight + lineRows > maxChatHeight) break;
    visibleLines.unshift(line);
    currentHeight += lineRows;
  }

  // 1. Tab bar at top (Row 1 - ALWAYS PINNED, NEVER SCROLLS OFF)
  console.log(renderTabBar(tabs, activeTabIdx));
  console.log('');

  // 2. Chat messages
  for (const line of visibleLines) {
    console.log(line);
  }

  // 3. Separated bottom card status & shortcuts line immediately above prompt
  const shortCwd = cwd ? (cwd.length > 36 ? '...' + cwd.slice(-33) : cwd) : '~';
  const modeBadge = currentAccessMode === 'review'
    ? OC.peach + '🛡️ Review' + OC.reset
    : OC.green + '⚡ Turbo' + OC.reset;
  const rightInfo = OC.barCyan + currentModel + ' ' + OC.peach + currentPower + OC.reset +
    ' · ' + modeBadge + OC.textDim + '   shift+tab model   ctrl+p commands';
  const rightVisLen = stripAnsi(rightInfo).length;
  const midSpace = ' '.repeat(Math.max(2, cols - shortCwd.length - rightVisLen - 2));

  console.log(' ' + OC.textDim + shortCwd + midSpace + rightInfo + OC.reset);
}

// ── Render: Access Mode Modal (Turbo vs Request Review) ──
function renderAccessModeModal(selectedIndex) {
  const cols = process.stdout.columns || 90;
  const rows = process.stdout.rows || 30;
  const modalW = Math.min(62, cols - 8);
  const leftPad = ' '.repeat(Math.max(2, Math.floor((cols - modalW) / 2)));

  console.clear();

  const topSpace = Math.max(2, Math.floor(rows * 0.18));
  for (let i = 0; i < topSpace; i++) console.log('');

  // Header
  const titleLeft = '  ' + OC.bold + OC.textWhite + 'Access Mode' + OC.reset;
  const escRight = OC.textDim + 'esc' + OC.reset + '  ';
  const headerPad = ' '.repeat(Math.max(1, modalW - 17));
  console.log(leftPad + OC.bgModal + titleLeft + OC.bgModal + headerPad + escRight + OC.reset);
  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);

  const options = [
    { id: 'review', title: 'Request Review', desc: 'Every command requires approval.', icon: '🛡️' },
    { id: 'turbo',  title: 'Turbo',          desc: 'Run all commands without restrictions.', icon: '🛡️' },
  ];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const isSel = (i === selectedIndex);
    const isActive = (opt.id === currentAccessMode);
    const checkmark = isActive ? OC.green + '✓' + OC.reset : ' ';

    const titleLine = `  ${opt.icon}  ${opt.title}`;
    const descLine  = `      ${opt.desc}`;
    const tPad = ' '.repeat(Math.max(1, modalW - 2 - stripAnsi(titleLine).length - 4));
    const dPad = ' '.repeat(Math.max(1, modalW - 2 - stripAnsi(descLine).length));

    if (isSel) {
      console.log(leftPad + OC.bgSelected + OC.fgBlack + OC.bold + titleLine + tPad + checkmark + ' ' + OC.reset);
      console.log(leftPad + OC.bgSelected + OC.fgBlack + descLine + dPad + OC.reset);
    } else {
      console.log(leftPad + OC.bgModal + OC.textWhite + titleLine + OC.bgModal + tPad + checkmark + ' ' + OC.reset);
      console.log(leftPad + OC.bgModal + OC.textDim + descLine + OC.bgModal + dPad + OC.reset);
    }
    console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);
  }
}

// ── Render: Theme & UI Colors Modal ──
function renderThemeModal(selectedIndex) {
  const cols = process.stdout.columns || 90;
  const rows = process.stdout.rows || 30;
  const modalW = Math.min(64, cols - 8);
  const leftPad = ' '.repeat(Math.max(2, Math.floor((cols - modalW) / 2)));

  console.clear();

  const topSpace = Math.max(2, Math.floor(rows * 0.15));
  for (let i = 0; i < topSpace; i++) console.log('');

  // Header
  const titleLeft = '  ' + OC.bold + OC.textWhite + 'Theme & UI Colors' + OC.reset;
  const escRight = OC.textDim + 'esc' + OC.reset + '  ';
  const headerPad = ' '.repeat(Math.max(1, modalW - 23));
  console.log(leftPad + OC.bgModal + titleLeft + OC.bgModal + headerPad + escRight + OC.reset);
  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);

  const themeKeys = Object.keys(THEMES);
  for (let i = 0; i < themeKeys.length; i++) {
    const k = themeKeys[i];
    const th = THEMES[k];
    const isSel = (i === selectedIndex);
    const isActive = (k === currentThemeId);
    const checkmark = isActive ? OC.green + '✓' + OC.reset : ' ';

    const swatch = th.barCyan + '■' + th.secondary + '■' + th.peach + '■' + OC.reset;
    const titleLine = `  ${swatch}  ${th.name}`;
    const tPad = ' '.repeat(Math.max(1, modalW - 2 - stripAnsi(titleLine).length - 4));

    if (isSel) {
      console.log(leftPad + OC.bgSelected + OC.fgBlack + OC.bold + titleLine + tPad + checkmark + ' ' + OC.reset);
    } else {
      console.log(leftPad + OC.bgModal + OC.textWhite + titleLine + OC.bgModal + tPad + checkmark + ' ' + OC.reset);
    }
  }
  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);
}

// ── Render: Command Palette Modal ──
function renderCommandPalette(query, selectedIndex, tabs, activeTabIdx, currentModel, currentPower) {
  const cols = process.stdout.columns || 90;
  const rows = process.stdout.rows || 30;
  const modalW = Math.min(66, cols - 8);
  const leftPad = ' '.repeat(Math.max(2, Math.floor((cols - modalW) / 2)));

  console.clear();

  // Top spacing
  const topSpace = Math.max(2, Math.floor(rows * 0.15));
  for (let i = 0; i < topSpace; i++) console.log('');

  // Modal header
  const titleLeft = '  ' + OC.bold + OC.textWhite + 'Commands' + OC.reset;
  const escRight = OC.textDim + 'esc' + OC.reset + '  ';
  const headerPad = ' '.repeat(Math.max(1, modalW - 13));
  console.log(leftPad + OC.bgModal + titleLeft + OC.bgModal + headerPad + escRight + OC.reset);
  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);

  // Search bar
  const searchDisplay = query ? OC.textWhite + query : OC.textMuted + 'search';
  const searchPlainLen = 4 + (query ? query.length : 6);
  const searchPad = ' '.repeat(Math.max(0, modalW - searchPlainLen));
  console.log(leftPad + OC.bgModal + '  ' + OC.peach + '█' + OC.reset + OC.bgModal + ' ' + searchDisplay + OC.bgModal + searchPad + OC.reset);
  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);

  // Items
  const filtered = getFilteredPaletteItems(query);
  const selectables = [];
  filtered.forEach((it, idx) => { if (it.type !== 'header') selectables.push(idx); });
  const activeIdx = selectables[selectedIndex % (selectables.length || 1)] ?? -1;

  for (let idx = 0; idx < filtered.length; idx++) {
    const it = filtered[idx];
    if (it.type === 'header') {
      const hdr = '  ' + OC.catViolet + it.text + OC.reset;
      const hdrPad = ' '.repeat(Math.max(0, modalW - 2 - it.text.length));
      console.log(leftPad + OC.bgModal + hdr + OC.bgModal + hdrPad + OC.reset);
    } else {
      const isSel = (idx === activeIdx);
      const keyHint = it.key || '';
      const titleStr = ' ' + it.title;
      const rightStr = keyHint ? keyHint + ' ' : '';
      const spacer = ' '.repeat(Math.max(1, modalW - 2 - titleStr.length - rightStr.length));

      if (isSel) {
        console.log(leftPad + OC.bgSelected + OC.fgBlack + OC.bold + ' ' + titleStr + spacer + rightStr + ' ' + OC.reset);
      } else {
        console.log(leftPad + OC.bgModal + '  ' + OC.textWhite + titleStr.slice(1) + OC.bgModal + spacer + OC.textDim + rightStr + OC.bgModal + ' ' + OC.reset);
      }
    }
  }

  console.log(leftPad + OC.bgModal + ' '.repeat(modalW) + OC.reset);

  // Below modal: show current state dimmed
  console.log('');
  const dimStatus = OC.textDim + ' ' + BAR + ' ' + OC.textDim +
    'Autonomous · ' + currentModel + ' ' + currentPower + OC.reset;
  console.log(dimStatus);
  const dimFoot = OC.textDim + '                              ' +
    'shift+tab model   ctrl+p commands  ' + OC.reset;
  console.log(dimFoot);
}

// ── Tool Step Animation ──
async function animateToolStep(actionText, detailText, durationMs = 300) {
  if (!isTTY) {
    console.log(`  ${OC.green}● ${actionText} ${detailText || ''}${OC.reset}`);
    return;
  }
  const spinnerFrames = ['—', '\\', '|', '/'];
  const spinnerColors = [OC.barCyan, rgb(121,192,255), OC.textWhite, rgb(188,140,255)];
  let frameIdx = 0;
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    const frame = spinnerFrames[frameIdx % spinnerFrames.length];
    const color = spinnerColors[frameIdx % spinnerColors.length];
    frameIdx++;
    process.stdout.write(`\r\x1b[K  ${color}${frame}${OC.reset} ${OC.textDim}${actionText}…${OC.reset}`);
    await sleep(40);
  }

  process.stdout.write(`\r\x1b[K  ${OC.green}● ${actionText}${OC.reset}`);
  if (detailText) process.stdout.write(` ${OC.textDim}${detailText}${OC.reset}`);
  process.stdout.write('\n');
}


function askReviewApproval(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    const wasRaw = process.stdin.isRaw;
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();

    const onKey = (chunk) => {
      process.stdin.removeListener('data', onKey);
      if (process.stdin.setRawMode && wasRaw !== undefined) {
        process.stdin.setRawMode(wasRaw);
      }
      const s = String(chunk);
      if (s === 'y' || s === 'Y' || s === '\r' || s === '\n' || s === ' ') {
        process.stdout.write(OC.green + 'Approved ✓\n\n' + OC.reset);
        resolve(true);
      } else {
        process.stdout.write(OC.red + 'Declined ✗\n\n' + OC.reset);
        resolve(false);
      }
    };

    process.stdin.once('data', onKey);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// INTERACTIVE SINGLE-WINDOW CHAT (OpenCode-Style)
// ═══════════════════════════════════════════════════════════════════════
async function runChat(options = {}) {
  let TOKEN_ID = options.tokenId || process.env.DSH_TOKEN_ID || '';
  let MODEL    = options.model   || process.env.DSH_MODEL    || '';
  const returnToMenu = Boolean(options.returnToMenu);

  if (isTTY) process.stdout.write(`\x1b]0;tokify. ${VERSION}\x07`);
  ensureDshWebSilent();

  const tokenStore = await autoDiscoverTokens();
  let currentToken = tokenStore.tokens.find(t => t.id === (TOKEN_ID || tokenStore.activeId)) || tokenStore.tokens[0];

  if (!currentToken) {
    console.error(`\n  ${OC.red}✗ Токены не найдены! Сначала добавьте токен.${OC.reset}\n`);
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
  let currentPowerIdx = 0;

  // ── Multi-Chat / Tabs ──
  let tabs = [{
    id: 1, title: 'New session',
    model: currentModel, powerIdx: currentPowerIdx, history: [],
  }];
  let activeTabIdx = 0;
  const getActiveTab = () => tabs[activeTabIdx] || tabs[0];

  // ── Command Palette & Modal States ──
  let isPaletteOpen = false;
  let paletteIndex = 0;
  let paletteQuery = '';

  let isAccessModalOpen = false;
  let accessModalIndex = currentAccessMode === 'turbo' ? 1 : 0;

  let isThemeModalOpen = false;
  let themeModalIndex = Math.max(0, Object.keys(THEMES).indexOf(currentThemeId));

  // ── Prompt String (OpenCode style: card with cyan bar) ──
  const getPromptString = () => {
    return OC.bgCard + ' ' + BAR + ' ' + OC.textWhite;
  };

  // ── Show Home Screen ──
  const cwd = process.cwd().replace(/\\/g, '/');
  if (isTTY && !options.noAnimation) {
    await playStartupAnimation();
  }
  renderOpenCodeHome(currentModel, POWER_MODES[currentPowerIdx].label, cwd, tabs, activeTabIdx);

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

  // ── Unified View Refresh (stays on Home screen if history is empty) ──
  const refreshCurrentView = () => {
    const curTab = getActiveTab();
    if (curTab.history.length === 0) {
      renderOpenCodeHome(curTab.model, POWER_MODES[curTab.powerIdx].label, cwd, tabs, activeTabIdx);
    } else {
      renderOpenCodeChat(tabs, activeTabIdx, curTab.history, curTab.model, POWER_MODES[curTab.powerIdx].label, isBusy, cwd);
    }
    if (isTTY) {
      process.stdout.write(`\x1b]0;tokify. · ${curTab.title} · ${curTab.model} · ${POWER_MODES[curTab.powerIdx].label}\x07`);
    }
    rl.setPrompt(getPromptString());
    rl._refreshLine();
  };

  // ── Tab Actions ──
  const switchTab = (targetIdx) => {
    if (targetIdx >= 0 && targetIdx < tabs.length) {
      activeTabIdx = targetIdx;
      const curTab = getActiveTab();
      currentModel = curTab.model;
      currentPowerIdx = curTab.powerIdx;
      refreshCurrentView();
    }
  };

  const createNewTab = (title = '') => {
    const nextId = tabs.length > 0 ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
    const tabTitle = title.trim() || `New session ${nextId}`;
    tabs.push({
      id: nextId, title: tabTitle,
      model: currentModel, powerIdx: currentPowerIdx, history: [],
    });
    activeTabIdx = tabs.length - 1;
    refreshCurrentView();
  };

  const closeCurrentTab = (targetIdx = activeTabIdx) => {
    if (tabs.length <= 1) {
      tabs[0].title = 'New session';
      tabs[0].history = [];
      activeTabIdx = 0;
      refreshCurrentView();
      return;
    }
    tabs.splice(targetIdx, 1);
    if (activeTabIdx >= tabs.length) activeTabIdx = tabs.length - 1;
    const curTab = getActiveTab();
    currentModel = curTab.model;
    currentPowerIdx = curTab.powerIdx;
    refreshCurrentView();
  };

  // ── Global Mouse Tracker and Stream Interceptor ──
  const cleanupMouse = () => {
    if (isTTY) {
      try { process.stdout.write('\x1b[?1000l\x1b[?1006l'); } catch {}
    }
  };
  process.on('exit', cleanupMouse);

  if (isTTY) {
    try { readline.emitKeypressEvents(process.stdin); } catch {}
    try { process.stdout.write('\x1b[?1000h\x1b[?1006h'); } catch {}
  }

  // Intercept raw stdin data BEFORE readline can mangle mouse SGR sequences into prompt text
  const origStdinEmit = process.stdin.emit;
  process.stdin.emit = function (event, chunk) {
    if (event === 'data' && (Buffer.isBuffer(chunk) || typeof chunk === 'string')) {
      const str = chunk.toString('utf8');
      const mouseRegex = /(?:\x1b\[<)?(\d+);(\d+);(\d+)([Mm])/g;
      let match;
      let hasMouse = false;
      while ((match = mouseRegex.exec(str)) !== null) {
        hasMouse = true;
        const button = parseInt(match[1], 10);
        const x = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);
        const isPress = match[4] === 'M';

        if (isPress && button === 0) {
          if (!isPaletteOpen && !isAccessModalOpen && !isThemeModalOpen) {
            if (y === 1 || y === 2) {
              if (x >= plusZone.startX && x <= plusZone.endX) {
                createNewTab();
              } else {
                for (const tz of tabZones) {
                  if (x >= tz.startX && x <= tz.endX) {
                    switchTab(tz.idx);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (hasMouse) {
        const cleaned = str.replace(/(?:\x1b\[<)?\d+;\d+;\d+[Mm]/g, '').replace(/\x1b\[</g, '');
        if (!cleaned) return true;
        chunk = Buffer.isBuffer(chunk) ? Buffer.from(cleaned) : cleaned;
      }
    }
    return origStdinEmit.apply(this, arguments);
  };

  // ── Model & Power Cycling ──
  const cycleModel = () => {
    if (isBusy) return;
    const curTab = getActiveTab();
    const curIdx = availableModels.indexOf(curTab.model);
    curTab.model = availableModels[(curIdx + 1) % availableModels.length];
    currentModel = curTab.model;
    refreshCurrentView();
  };

  const cyclePower = () => {
    if (isBusy) return;
    const curTab = getActiveTab();
    curTab.powerIdx = (curTab.powerIdx + 1) % POWER_MODES.length;
    currentPowerIdx = curTab.powerIdx;
    refreshCurrentView();
  };

  // ── Command Palette Execution ──
  const executePaletteAction = (itemId) => {
    isPaletteOpen = false;
    paletteQuery = '';
    paletteIndex = 0;

    switch (itemId) {
      case 'switch_session':
        switchTab((activeTabIdx + 1) % tabs.length);
        break;
      case 'new_session':
        createNewTab();
        break;
      case 'switch_access':
        isAccessModalOpen = true;
        accessModalIndex = currentAccessMode === 'turbo' ? 1 : 0;
        renderAccessModeModal(accessModalIndex);
        return;
      case 'switch_theme':
        isThemeModalOpen = true;
        themeModalIndex = Math.max(0, Object.keys(THEMES).indexOf(currentThemeId));
        renderThemeModal(themeModalIndex);
        return;
      case 'view_history':
        refreshCurrentView();
        console.log(`\n${OC.bold}${OC.textWhite}─── Full Session History (${getActiveTab().title}) ───${OC.reset}\n`);
        for (const m of getActiveTab().history) {
          if (m.role === 'user') {
            console.log(' ' + OC.bgCard + ' ' + BAR + ' ' + OC.textWhite + m.content + OC.reset + '\n');
          } else {
            console.log('  ' + OC.textDim + '+ Thought · ' + (m.thought || '2s') + OC.reset);
            for (const b of renderMarkdownBlocks(m.content, 90)) console.log(b);
            console.log('');
          }
        }
        safePrompt();
        return;
      case 'switch_model':
        cycleModel();
        break;
      case 'switch_power':
        cyclePower();
        break;
      case 'token_manager':
        refreshCurrentView();
        // Trigger /tokens logic inline
        (async () => {
          const store = await autoDiscoverTokens();
          console.log(`\n${C.bold}${C.snow}Сохранённые токены:${C.reset}`);
          for (let i = 0; i < store.tokens.length; i++) {
            const t = store.tokens[i];
            const isCur = (t.id === currentToken.id);
            const mark = isCur ? `${C.green}● ${C.bold}` : `  `;
            console.log(`${mark}[${i + 1}] ${t.name}${C.reset} ${C.dimText}(${maskKey(t.key)})${C.reset}`);
          }
          console.log(`\n${C.dimText}Для переключения: /token <номер>${C.reset}\n`);
          safePrompt();
        })();
        return;
      case 'stats':
        refreshCurrentView();
        (async () => {
          await animateToolStep('Querying Tokify Gateway', currentToken.name, 250);
          const info = await verifyKey(currentToken.key).catch(() => null);
          if (info) {
            const Q = info.quota || {};
            const U = info.usage || {};
            const L = info.limits || {};
            console.log(`\n${C.bold}${C.snow}Статистика ключа:${C.reset} ${C.ice}${info.prefix || maskKey(currentToken.key)}${C.reset}`);
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
        })();
        return;
      case 'clear_chat':
        getActiveTab().history = [];
        getActiveTab().title = 'New session';
        refreshCurrentView();
        break;
      case 'help':
        refreshCurrentView();
        console.log('');
        console.log(`${OC.bold}${OC.textWhite}tokify. Commands:${OC.reset}`);
        console.log(`  ${C.cyan}Shift+Tab${C.reset}       ${C.dimText}— Cycle model${C.reset}`);
        console.log(`  ${C.cyan}Tab${C.reset}             ${C.dimText}— Cycle power (High/Medium/Fast)${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+P${C.reset}          ${C.dimText}— Open command palette${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+A / F4${C.reset}     ${C.dimText}— Access mode (Request Review / Turbo)${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+K / F3${C.reset}     ${C.dimText}— Theme & UI colors${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+V${C.reset}          ${C.dimText}— Paste from Windows clipboard${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+T${C.reset}          ${C.dimText}— New session tab (or click +)${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+W${C.reset}          ${C.dimText}— Close current tab${C.reset}`);
        console.log(`  ${C.cyan}Ctrl+Right/Left${C.reset} ${C.dimText}— Switch between tabs${C.reset}`);
        console.log(`  ${C.cyan}Alt+1..9${C.reset}        ${C.dimText}— Jump to tab 1..9${C.reset}`);
        console.log(`  ${C.cyan}/model [name]${C.reset}   ${C.dimText}— Switch model${C.reset}`);
        console.log(`  ${C.cyan}/power [1-3]${C.reset}    ${C.dimText}— Switch power level${C.reset}`);
        console.log(`  ${C.cyan}/access${C.reset}         ${C.dimText}— Toggle Access mode (Turbo/Review)${C.reset}`);
        console.log(`  ${C.cyan}/theme${C.reset}          ${C.dimText}— Change color theme${C.reset}`);
        console.log(`  ${C.cyan}/history${C.reset}        ${C.dimText}— View full session history${C.reset}`);
        console.log(`  ${C.cyan}/stats${C.reset}          ${C.dimText}— Token usage & balance${C.reset}`);
        console.log(`  ${C.cyan}/tokens${C.reset}         ${C.dimText}— List saved tokens${C.reset}`);
        console.log(`  ${C.cyan}/clear${C.reset}          ${C.dimText}— Clear chat history${C.reset}`);
        console.log(`  ${C.cyan}/exit${C.reset}           ${C.dimText}— Exit program${C.reset}`);
        console.log('');
        safePrompt();
        break;
      case 'exit':
        cleanupMouse();
        console.log(`\n${C.dimText}До встречи! 👋${C.reset}\n`);
        process.exit(0);
        break;
      default:
        refreshCurrentView();
        safePrompt();
    }
  };

  // ── Keyboard Interceptor (includes Command Palette modal handling) ──
  const origTTYWrite = rl._ttyWrite.bind(rl);
  rl._ttyWrite = function(s, key) {
    // ── Access Mode Modal ──
    if (isAccessModalOpen) {
      if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
        isAccessModalOpen = false;
        refreshCurrentView();
        return;
      }
      if (key && (key.name === 'up' || key.name === 'k')) {
        accessModalIndex = (accessModalIndex - 1 + 2) % 2;
        renderAccessModeModal(accessModalIndex);
        return;
      }
      if (key && (key.name === 'down' || key.name === 'j')) {
        accessModalIndex = (accessModalIndex + 1) % 2;
        renderAccessModeModal(accessModalIndex);
        return;
      }
      if (key && (key.name === 'return' || key.name === 'space')) {
        currentAccessMode = accessModalIndex === 1 ? 'turbo' : 'review';
        saveUserSettings();
        isAccessModalOpen = false;
        refreshCurrentView();
        return;
      }
      return;
    }

    // ── Theme / UI Colors Modal ──
    if (isThemeModalOpen) {
      const themeKeys = Object.keys(THEMES);
      if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
        isThemeModalOpen = false;
        refreshCurrentView();
        return;
      }
      if (key && (key.name === 'up' || key.name === 'k')) {
        themeModalIndex = (themeModalIndex - 1 + themeKeys.length) % themeKeys.length;
        renderThemeModal(themeModalIndex);
        return;
      }
      if (key && (key.name === 'down' || key.name === 'j')) {
        themeModalIndex = (themeModalIndex + 1) % themeKeys.length;
        renderThemeModal(themeModalIndex);
        return;
      }
      if (key && (key.name === 'return' || key.name === 'space')) {
        applyTheme(themeKeys[themeModalIndex], true);
        isThemeModalOpen = false;
        refreshCurrentView();
        return;
      }
      return;
    }

    // ── Command Palette Mode ──
    if (isPaletteOpen) {
      if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
        isPaletteOpen = false;
        paletteQuery = '';
        paletteIndex = 0;
        refreshCurrentView();
        return;
      }
      const selectables = getSelectablePaletteItems(paletteQuery);
      if (key && key.name === 'up') {
        paletteIndex = (paletteIndex - 1 + selectables.length) % selectables.length;
        renderCommandPalette(paletteQuery, paletteIndex, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
        return;
      }
      if (key && key.name === 'down') {
        paletteIndex = (paletteIndex + 1) % selectables.length;
        renderCommandPalette(paletteQuery, paletteIndex, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
        return;
      }
      if (key && key.name === 'return') {
        if (selectables.length > 0) {
          const selected = selectables[paletteIndex % selectables.length];
          executePaletteAction(selected.id);
        }
        return;
      }
      if (key && key.name === 'backspace') {
        paletteQuery = paletteQuery.slice(0, -1);
        paletteIndex = 0;
        renderCommandPalette(paletteQuery, paletteIndex, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
        return;
      }
      // Typing into search
      if (s && s.length === 1 && s >= ' ') {
        paletteQuery += s;
        paletteIndex = 0;
        renderCommandPalette(paletteQuery, paletteIndex, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
        return;
      }
      // Ignore all other keys while palette is open
      return;
    }

    // ── Normal Mode Handlers ──
    // Filter out any stray mouse escape sequences from terminal
    if (s && /(?:\x1b\[<)?\d+;\d+;\d+[Mm]/.test(s)) {
      return;
    }
    if (rl.line && /(?:\x1b\[<)?\d+;\d+;\d+[Mm]/.test(rl.line)) {
      rl.line = rl.line.replace(/(?:\x1b\[<)?\d+;\d+;\d+[Mm]/g, '');
      rl._refreshLine();
    }

    // Ctrl+V → Paste from Windows system clipboard
    if ((key && key.ctrl && key.name === 'v') || s === '\x16') {
      const text = getClipboardText();
      if (text) {
        const cur = rl.cursor;
        rl.line = rl.line.slice(0, cur) + text + rl.line.slice(cur);
        rl.cursor = cur + text.length;
        rl._refreshLine();
      }
      return;
    }

    // '+' key creates a new tab when input line is empty
    if (s === '+' && rl.line.trim() === '') {
      createNewTab();
      return;
    }

    // Ctrl+P → Open Command Palette
    if ((key && key.ctrl && key.name === 'p') || s === '\x10') {
      if (isBusy) return;
      isPaletteOpen = true;
      paletteIndex = 0;
      paletteQuery = '';
      renderCommandPalette('', 0, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
      return;
    }

    // Ctrl+A / F4 → Open Access Mode Modal (Request Review vs Turbo)
    if ((key && key.ctrl && key.name === 'a') || (key && key.name === 'f4')) {
      if (isBusy) return;
      isAccessModalOpen = true;
      accessModalIndex = currentAccessMode === 'turbo' ? 1 : 0;
      renderAccessModeModal(accessModalIndex);
      return;
    }

    // Ctrl+K / F3 → Open Themes & UI Colors Modal
    if ((key && key.ctrl && key.name === 'k') || (key && key.name === 'f3')) {
      if (isBusy) return;
      isThemeModalOpen = true;
      themeModalIndex = Math.max(0, Object.keys(THEMES).indexOf(currentThemeId));
      renderThemeModal(themeModalIndex);
      return;
    }

    // Shift+Tab → Cycle model
    if (isShiftTab(s, key)) { cycleModel(); return; }

    // Tab → Cycle power (block indentation in input)
    if (isCtrlTab(s, key) || (key && key.name === 'tab') || s === '\t') {
      cyclePower(); return;
    }

    // Ctrl+T → New tab
    if ((key && key.ctrl && key.name === 't') || s === '\x14') { createNewTab(); return; }

    // Ctrl+W → Close tab
    if ((key && key.ctrl && key.name === 'w') || s === '\x17') { closeCurrentTab(); return; }

    // Left / Right arrow keys switch tabs when input line is empty
    if (rl.line === '' && key && key.name === 'right') {
      switchTab((activeTabIdx + 1) % tabs.length);
      return;
    }
    if (rl.line === '' && key && key.name === 'left') {
      switchTab((activeTabIdx - 1 + tabs.length) % tabs.length);
      return;
    }

    // Ctrl+Right / Ctrl+Left → Switch tabs
    if (key && (key.name === 'f6' || (key.ctrl && key.name === 'right'))) {
      switchTab((activeTabIdx + 1) % tabs.length); return;
    }
    if (key && (key.name === 'f7' || (key.ctrl && key.name === 'left'))) {
      switchTab((activeTabIdx - 1 + tabs.length) % tabs.length); return;
    }

    // Alt+1..9 → Jump to tab
    if (key && key.meta && /^[1-9]$/.test(key.name)) {
      const idx = parseInt(key.name, 10) - 1;
      if (idx < tabs.length) { switchTab(idx); return; }
    }
    if (s && /^\x1b[1-9]$/.test(s)) {
      const idx = parseInt(s[1], 10) - 1;
      if (idx < tabs.length) { switchTab(idx); return; }
    }

    return origTTYWrite(s, key);
  };

  safePrompt();

  return new Promise((resolve) => {
    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { safePrompt(); return; }

      let timerId = null;
      try {
        if (input.startsWith('/')) {
          const [cmd, ...args] = input.split(/\s+/);
          const argStr = args.join(' ').trim();

          switch (cmd.toLowerCase()) {
            case '/help':
              console.log('');
              console.log(`${OC.bold}${OC.textWhite}Доступные команды tokify.:${OC.reset}`);
              console.log(`  ${C.cyan}Shift+Tab${C.reset}       ${C.dimText}— Переключение модели (или F2 / /model)${C.reset}`);
              console.log(`  ${C.cyan}Tab${C.reset}             ${C.dimText}— Переключение мощности (High / Med / Fast)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+P${C.reset}          ${C.dimText}— Командная палитра (OpenCode Command Palette)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+A / F4${C.reset}     ${C.dimText}— Режим доступа (Request Review / Turbo)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+K / F3${C.reset}     ${C.dimText}— Смена темы интерфейса (Цвета / Crimson / Cyber)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+V${C.reset}          ${C.dimText}— Вставка текста из буфера обмена Windows${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+T${C.reset}          ${C.dimText}— Создать новую сессию (или /new / +)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+W${C.reset}          ${C.dimText}— Закрыть текущую сессию (или /close)${C.reset}`);
              console.log(`  ${C.cyan}Ctrl+Right/Left${C.reset} ${C.dimText}— Переключение между сессиями (или /tab)${C.reset}`);
              console.log(`  ${C.cyan}Alt+1..9${C.reset}        ${C.dimText}— Мгновенный переход на сессию 1..9${C.reset}`);
              console.log(`  ${C.cyan}/access${C.reset}         ${C.dimText}— Настройка режима доступа (Review / Turbo)${C.reset}`);
              console.log(`  ${C.cyan}/theme${C.reset}          ${C.dimText}— Выбор цветовой темы${C.reset}`);
              console.log(`  ${C.cyan}/history${C.reset}        ${C.dimText}— Показать полную историю сессии${C.reset}`);
              console.log(`  ${C.cyan}/tab [1-9]${C.reset}      ${C.dimText}— Переключение на сессию по номеру${C.reset}`);
              console.log(`  ${C.cyan}/new [имя]${C.reset}      ${C.dimText}— Создать новую сессию${C.reset}`);
              console.log(`  ${C.cyan}/close [№]${C.reset}      ${C.dimText}— Закрыть сессию${C.reset}`);
              console.log(`  ${C.cyan}/power [1-3]${C.reset}    ${C.dimText}— Выбор мощности (1: High, 2: Medium, 3: Fast)${C.reset}`);
              console.log(`  ${C.cyan}/model [имя]${C.reset}    ${C.dimText}— Выбор модели${C.reset}`);
              console.log(`  ${C.cyan}/tokens${C.reset}         ${C.dimText}— Список токенов${C.reset}`);
              console.log(`  ${C.cyan}/token <№>${C.reset}     ${C.dimText}— Переключить токен${C.reset}`);
              console.log(`  ${C.cyan}/stats${C.reset}          ${C.dimText}— Статистика и баланс токена${C.reset}`);
              console.log(`  ${C.cyan}/web${C.reset}            ${C.dimText}— Проверить DSH Web (http://127.0.0.1:3080)${C.reset}`);
              console.log(`  ${C.cyan}/clear${C.reset}          ${C.dimText}— Очистить историю сессии и вернуть стартовый экран${C.reset}`);
              console.log(`  ${C.cyan}/commands${C.reset}       ${C.dimText}— Открыть палитру команд (Ctrl+P)${C.reset}`);
              console.log(`  ${C.cyan}/exit${C.reset}           ${C.dimText}— Выход${C.reset}`);
              console.log('');
              safePrompt();
              return;

            case '/commands':
            case '/menu':
              isPaletteOpen = true;
              paletteIndex = 0;
              paletteQuery = '';
              renderCommandPalette('', 0, tabs, activeTabIdx, currentModel, POWER_MODES[currentPowerIdx].label);
              return;

            case '/tabs': {
              console.log(`\n${OC.bold}${OC.textWhite}Открытые сессии (${tabs.length}):${OC.reset}`);
              for (let i = 0; i < tabs.length; i++) {
                const t = tabs[i];
                const isCur = (i === activeTabIdx);
                const mark = isCur ? `${OC.green}● ${OC.bold}` : `  `;
                console.log(`${mark}[${i + 1}] ${t.title}${OC.reset} · ${OC.barCyan}${t.model}${OC.reset} · ${OC.peach}[${POWER_MODES[t.powerIdx].label}]${OC.reset} · ${OC.textDim}${t.history.length} сообщ.${OC.reset}`);
              }
              console.log('');
              safePrompt();
              return;
            }

            case '/tab':
            case '/t': {
              if (!argStr) {
                console.log(`${OC.peach}Укажите номер сессии: /tab <1-${tabs.length}> или next/prev${OC.reset}\n`);
                safePrompt();
                return;
              }
              const clean = argStr.toLowerCase();
              if (clean === 'next' || clean === 'n') { switchTab((activeTabIdx + 1) % tabs.length); return; }
              if (clean === 'prev' || clean === 'p') { switchTab((activeTabIdx - 1 + tabs.length) % tabs.length); return; }
              const num = parseInt(clean, 10);
              if (!isNaN(num) && num >= 1 && num <= tabs.length) { switchTab(num - 1); return; }
              console.log(`${OC.red}✗ Сессия #${argStr} не найдена. Всего сессий: ${tabs.length}${OC.reset}\n`);
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
              if (argStr) {
                getActiveTab().title = argStr.slice(0, 24);
                refreshCurrentView();
                return;
              }
              console.log(`${OC.peach}Укажите новое название: /rename <название>${OC.reset}\n`);
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
                  refreshCurrentView();
                  return;
                }
              }
              console.log(`\n${OC.bold}${OC.textWhite}Режимы мощности модели:${OC.reset}`);
              for (let i = 0; i < POWER_MODES.length; i++) {
                const p = POWER_MODES[i];
                const isCur = (i === currentPowerIdx);
                const mark = isCur ? `${OC.green}● ${OC.bold}` : `  `;
                console.log(`${mark}[${i + 1}] ${OC.peach}${p.label}${OC.reset} — ${OC.textDim}${p.desc}${OC.reset}`);
              }
              console.log('');
              safePrompt();
              return;
            }

            case '/tokens': {
              const store = await autoDiscoverTokens();
              console.log(`\n${OC.bold}${OC.textWhite}Сохранённые токены:${OC.reset}`);
              for (let i = 0; i < store.tokens.length; i++) {
                const t = store.tokens[i];
                const isCur = (t.id === currentToken.id);
                const mark = isCur ? `${OC.green}● ${OC.bold}` : `  `;
                console.log(`${mark}[${i + 1}] ${t.name}${OC.reset} ${OC.textDim}(${maskKey(t.key)})${OC.reset}`);
              }
              console.log(`\n${OC.textDim}Для переключения: /token <номер>${OC.reset}\n`);
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
                console.log(`${OC.red}✗ Неверный номер. Введите /tokens для списка токенов.${OC.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/model': {
              if (argStr) {
                let found = null;
                const num = parseInt(argStr, 10);
                if (!isNaN(num) && availableModels[num - 1]) found = availableModels[num - 1];
                else found = availableModels.find(m => m.toLowerCase().includes(argStr.toLowerCase()));

                if (found) {
                  currentModel = found;
                  getActiveTab().model = found;
                  refreshCurrentView();
                  return;
                }
                console.log(`${OC.red}✗ Модель не найдена: ${argStr}${OC.reset}`);
              } else {
                console.log(`\n${OC.bold}${OC.textWhite}Доступные модели (${availableModels.length}):${OC.reset}`);
                const curM = getActiveTab().model;
                for (let i = 0; i < availableModels.length; i++) {
                  const m = availableModels[i];
                  const activeMark = (m === curM) ? `${OC.green}● ${OC.bold}` : `  ${OC.textDim}`;
                  console.log(`${activeMark}[${i + 1}] ${m}${OC.reset}`);
                }
                console.log(`\n${OC.textDim}Сменить: Shift+Tab или /model <номер|имя>${OC.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/stats': {
              await animateToolStep('Querying Tokify Gateway', currentToken.name, 250);
              const info = await verifyKey(currentToken.key).catch(() => null);
              if (info) {
                const Q = info.quota || {};
                const U = info.usage || {};
                const L = info.limits || {};
                console.log(`\n${OC.bold}${OC.textWhite}Статистика ключа:${OC.reset} ${OC.barCyan}${info.prefix || maskKey(currentToken.key)}${OC.reset}`);
                if (Q.total != null) {
                  const used = Q.used || 0;
                  const total = Q.total || 1;
                  const pct = Math.min(100, (used / total) * 100).toFixed(1);
                  const color = pct >= 90 ? OC.red : pct >= 70 ? OC.yellow : OC.green;
                  const width = 24;
                  const filled = Math.round((used / total) * width);
                  const bar = color + '█'.repeat(filled) + OC.textDim + '·'.repeat(width - filled) + OC.reset;
                  console.log(`  Пакет токенов:   [${bar}] ${color}${pct}%${OC.reset} · остаток ${OC.bold}${fmtTok(Q.remaining ?? 0)}${OC.reset} из ${fmtTok(total)}`);
                } else {
                  console.log(`  Пакет токенов:   ${OC.textDim}безлимит${OC.reset}`);
                }
                if (L.rpm) console.log(`  RPM лимит:       ${OC.textDim}${L.rpm} зап/мин${OC.reset}`);
                if (L.rpd) console.log(`  RPD сегодня:     ${OC.textDim}${U.today_requests || 0}/${L.rpd}${OC.reset}`);
                console.log(`  Всего запросов:  ${OC.textDim}${(U.total_requests || 0).toLocaleString()} · токенов: ${fmtTok(U.total_tokens || 0)}${OC.reset}\n`);
              } else {
                console.log(`${OC.red}✗ Не удалось загрузить статистику${OC.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/web': {
              const alive = await isDshWebAlive();
              if (alive) {
                console.log(`\n${OC.green}● DSH Web активен в фоне:${OC.reset} ${OC.barCyan}http://127.0.0.1:3080/${OC.reset}\n`);
              } else {
                await animateToolStep('Starting DSH Web in background', 'port 3080', 400);
                await ensureDshWebSilent();
                console.log(`\n${OC.green}● DSH Web запущен в фоне:${OC.reset} ${OC.barCyan}http://127.0.0.1:3080/${OC.reset}\n`);
              }
              safePrompt();
              return;
            }

            case '/access':
            case '/mode': {
              const clean = argStr.toLowerCase();
              if (clean === 'turbo' || clean === 't') {
                currentAccessMode = 'turbo';
                saveUserSettings();
                refreshCurrentView();
                return;
              }
              if (clean === 'review' || clean === 'r') {
                currentAccessMode = 'review';
                saveUserSettings();
                refreshCurrentView();
                return;
              }
              isAccessModalOpen = true;
              accessModalIndex = currentAccessMode === 'turbo' ? 1 : 0;
              renderAccessModeModal(accessModalIndex);
              return;
            }

            case '/turbo': {
              currentAccessMode = 'turbo';
              saveUserSettings();
              refreshCurrentView();
              return;
            }

            case '/review': {
              currentAccessMode = 'review';
              saveUserSettings();
              refreshCurrentView();
              return;
            }

            case '/theme':
            case '/colors': {
              if (argStr) {
                const targetKey = argStr.toLowerCase().trim();
                if (THEMES[targetKey]) {
                  applyTheme(targetKey, true);
                  refreshCurrentView();
                  return;
                }
              }
              isThemeModalOpen = true;
              themeModalIndex = Math.max(0, Object.keys(THEMES).indexOf(currentThemeId));
              renderThemeModal(themeModalIndex);
              return;
            }

            case '/history': {
              refreshCurrentView();
              console.log(`\n${OC.bold}${OC.textWhite}─── Full Session History (${getActiveTab().title}) ───${OC.reset}\n`);
              for (const m of getActiveTab().history) {
                if (m.role === 'user') {
                  console.log(' ' + OC.bgCard + ' ' + BAR + ' ' + OC.textWhite + m.content + OC.reset + '\n');
                } else {
                  console.log('  ' + OC.textDim + '+ Thought · ' + (m.thought || '2s') + OC.reset);
                  for (const b of renderMarkdownBlocks(m.content, 90)) console.log(b);
                  console.log('');
                }
              }
              safePrompt();
              return;
            }

            case '/clear':
              getActiveTab().history = [];
              getActiveTab().title = 'New session';
              renderOpenCodeHome(currentModel, POWER_MODES[currentPowerIdx].label, cwd);
              safePrompt();
              return;

            case '/exit':
            case '/quit':
              console.log(`\n${OC.textDim}До встречи! 👋${OC.reset}\n`);
              rl.close();
              resolve('exit');
              process.exit(0);
              return;

            case '/plan':
              break;

            default:
              console.log(`${OC.red}Неизвестная команда. Введите /help для списка.${OC.reset}\n`);
              safePrompt();
              return;
          }
        }

        // ── Autonomous Agent Loop (Full PC Access) ──
        isBusy = true;
        rl.pause();

        const isPlan = input.startsWith('/plan');
        const userPrompt = isPlan ? input.replace(/^\/plan\s*/i, '').trim() : input;

        if (!userPrompt) {
          console.log(`${OC.peach}Укажите задачу: /plan <описание>${OC.reset}\n`);
          safePrompt();
          return;
        }

        const curTab = getActiveTab();
        if (/^New session$|^Chat \d+$/i.test(curTab.title)) {
          const words = userPrompt.split(/\s+/).slice(0, 4).join(' ');
          if (words.length > 0) curTab.title = words.slice(0, 18);
        }

        const curPower = POWER_MODES[curTab.powerIdx];
        const curMod = curTab.model;
        const systemInstruction =
          'You are tokify. 2.0, an advanced autonomous AI coding and system engineer with FULL DIRECT ACCESS to the user Windows PC. ' +
          `Operating Power Level: ${curPower.label} (${curPower.instruction}). ` +
          'You have real tools: run_powershell, write_file, read_file, list_directory. ' +
          'When the user asks you to create, modify, inspect files, or perform ANY action on their PC (e.g. creating files on Desktop, running scripts): ' +
          'YOU MUST EXECUTE YOUR TOOLS TO ACTUALLY PERFORM THE ACTION ON THE COMPUTER. ' +
          'NEVER refuse by saying you lack access. You HAVE full access through your tools. ' +
          'If the user invokes /plan, generate an exhaustive architectural plan and design document, creating any needed files on disk. ' +
          'Always respond clearly in Russian.';

        curTab.history.push({ role: 'user', content: userPrompt });
        if (curTab.history.length > 30) curTab.history = curTab.history.slice(-30);

        curTab.activeSteps = [];

        // Repaint OpenCode chat screen immediately showing the user card
        renderOpenCodeChat(tabs, activeTabIdx, curTab.history, curMod, curPower.label, true, cwd, curTab.activeSteps);

        const messages = [
          { role: 'system', content: systemInstruction },
          ...curTab.history,
        ];

        const startTime = Date.now();
        timerId = null;

        const startThinkingShimmer = () => {
          if (!isTTY) return null;
          const shimmerWidth = 16;
          let beamPos = 0;
          let beamDir = 1;
          return setInterval(() => {
            const elapsed = formatDuration(Date.now() - startTime);
            beamPos += beamDir;
            if (beamPos >= shimmerWidth - 1) { beamDir = -1; beamPos = shimmerWidth - 1; }
            else if (beamPos <= 0) { beamDir = 1; beamPos = 0; }
            const beam = renderShimmerBeam(shimmerWidth, beamPos);
            process.stdout.write(`\r\x1b[K  ${beam}   ${OC.barCyan}●${OC.reset} ${OC.textDim}Thought for ${elapsed}…${OC.reset}`);
          }, 40);
        };

        timerId = startThinkingShimmer();

        let agentLoopDone = false;
        let finalResponseText = '';

        while (!agentLoopDone) {
          const completion = await callChatWithTools(messages, curMod, currentToken.key, curPower);
          const choice = completion.choices?.[0];
          if (!choice) throw new Error('Empty response from model API');

          // Tool calls branch
          if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
            if (timerId) { clearInterval(timerId); timerId = null; }
            if (isTTY) process.stdout.write('\r\x1b[K');

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

              // In Request Review mode, ask approval before executing
              if (currentAccessMode === 'review') {
                const promptMsg = `\n  ${OC.peach}🛡️ [Review Request]${OC.reset} ${OC.bold}${actionDisplay}${OC.reset} ${OC.textDim}${detailDisplay}${OC.reset}\n  ${OC.barCyan}Execute this command? [Y/n]: ${OC.reset}`;
                const approved = await askReviewApproval(promptMsg);
                if (!approved) {
                  messages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: 'Command was declined by user in Request Review mode.',
                  });
                  continue;
                }
              }

              curTab.activeSteps.push({ action: actionDisplay, detail: detailDisplay, status: 'running' });
              renderOpenCodeChat(tabs, activeTabIdx, curTab.history, curMod, curPower.label, true, cwd, curTab.activeSteps);

              await sleep(180);
              const toolResult = executeSystemTool(fnName, fnArgs);
              const curStep = curTab.activeSteps[curTab.activeSteps.length - 1];
              if (curStep) curStep.status = 'done';
              renderOpenCodeChat(tabs, activeTabIdx, curTab.history, curMod, curPower.label, true, cwd, curTab.activeSteps);

              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: String(toolResult),
              });
            }

            timerId = startThinkingShimmer();
            continue;
          }

          // Direct final response
          if (timerId) { clearInterval(timerId); timerId = null; }
          if (isTTY) process.stdout.write('\r\x1b[K');

          finalResponseText = choice.message?.content || '';
          agentLoopDone = true;
        }

        curTab.activeSteps = [];

        if (finalResponseText) {
          const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000);
          const estTokens = Math.max(12, Math.round(finalResponseText.length / 3.5));
          const speed = (estTokens / elapsedSec).toFixed(1) + ' tok/s';
          const durStr = formatDuration(Date.now() - startTime);
          curTab.history.push({
            role: 'assistant',
            content: finalResponseText,
            duration: durStr,
            thought: durStr,
            speed: speed,
            model: curMod,
            power: curPower.label,
          });
          curTab.tokens = (curTab.tokens || 1400) + estTokens + Math.round(userPrompt.length / 3.5);
        }

      } catch (err) {
        if (timerId) clearInterval(timerId);
        if (isTTY) process.stdout.write('\r\x1b[K');
        console.log(`\n  ${OC.red}✗ Ошибка API: ${err.message}${OC.reset}\n`);
        const curTab = getActiveTab();
        if (curTab && curTab.history.length > 0) curTab.history.pop();
      } finally {
        isBusy = false;
        refreshCurrentView();
        safePrompt();
      }
    });

    rl.on('close', async () => {
      cleanupMouse();
      if (origStdinEmit) process.stdin.emit = origStdinEmit;
      while (isBusy) await sleep(80);
      resolve('close');
    });
  });
}

// ── Interactive Single-Window Launcher Menu (Fallback / --menu) ──
function renderBanner(activeToken, webActive) {
  console.clear();
  const webMark = webActive ? chalk.green('● Активен в фоне (3080)') : chalk.yellow('○ Не запущен');
  const tokMark = activeToken
    ? `${chalk.green('●')} ${chalk.bold(activeToken.name)} ${chalk.dim(`(${maskKey(activeToken.key)})`)}`
    : chalk.red('○ Не выбран');

  console.log(boxen(
    `${chalk.cyan.bold('  tokify. · Autonomous Agent with Full PC Access  ')}\n\n` +
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
        { name: '🚀  [1] Запустить tokify. Чат (OpenCode UI)', value: '1click' },
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

        const { selectedId } = await inquirer.prompt([{
          type: 'list', name: 'selectedId', message: 'Выберите активный токен:', choices,
        }]);
        data.activeId = selectedId;
        saveTokens(data);
        const newAct = data.tokens.find(t => t.id === selectedId);
        if (newAct) syncDshSettingsFull(newAct.key);
        console.log(chalk.green(`\n  ✓ Активный токен обновлён: ${newAct?.name}\n`));
        await pause();
        break;
      }

      case 'add': {
        const { key } = await inquirer.prompt([{
          type: 'input', name: 'key', message: 'Введите API-ключ (sk-…):',
          validate: v => (v && v.trim().startsWith('sk-')) ? true : 'Ключ должен начинаться с "sk-"',
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
          type: 'confirm', name: 'launchNow', message: 'Открыть tokify. прямо сейчас?', default: true,
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
  if (argv.includes('--menu')) {
    await menuLoop();
  } else {
    // Default: Boot directly into the OpenCode-style interface!
    await runChat({ returnToMenu: false });
    process.exit(0);
  }
})().catch(e => {
  console.error('Ошибка:', e.message || e);
  process.exit(1);
});
