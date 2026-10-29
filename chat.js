#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  Antigravity CLI / DSH Chat Client
 *  Interactive terminal chat for DeepSeek Harness (DSH) & Tokify Gateway
 *  Aesthetic replica of Google Antigravity CLI with smooth animations
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

// ─── Environment & Paths ───
const HOME        = os.homedir();
const TOKENS_DIR  = path.join(HOME, '.dsh-launcher');
const TOKENS_FILE = path.join(TOKENS_DIR, 'tokens.json');
const DSH_DIR     = path.join(HOME, '.dsh');
const DSH_SETTINGS= path.join(DSH_DIR, 'settings.yaml');
const DSH_CRED    = path.join(DSH_DIR, '.credentials.yaml');
const DESKTOP_KEYS= path.join(HOME, 'Desktop', 'keys.json');
const BASE_URL    = (process.env.FUNPAY_BASE || 'https://tokify.sale').replace(/\/+$/, '');
const VERSION     = '1.4.9';
const DSH_CRED_KEY= 'BUYTOKENS_API_KEY';

// ─── ANSI Colors & Styling ───
const isTTY = Boolean(process.stdout.isTTY);
const rgb   = (r, g, b) => isTTY ? `\x1b[38;2;${r};${g};${b}m` : '';
const bgRgb = (r, g, b) => isTTY ? `\x1b[48;2;${r};${g};${b}m` : '';
const ESC   = (code)    => isTTY ? `\x1b[${code}m` : '';

const C = {
  reset:     ESC(0),
  bold:      ESC(1),
  dim:       ESC(2),
  italic:    ESC(3),
  under:     ESC(4),
  cyan:      rgb(88, 166, 255),   // #58a6ff (prompt, links)
  ice:       rgb(121, 192, 255),  // #79c0ff (headers, model)
  green:     rgb(63, 185, 80),    // #3fb950 (tool badges, checkmarks)
  orange:    rgb(255, 140, 0),    // #ff8c00
  yellow:    rgb(234, 179, 8),    // #eab308
  red:       rgb(248, 81, 73),    // #f85149
  purple:    rgb(188, 140, 255),  // #bc8cff
  snow:      rgb(240, 246, 252),  // #f0f6fc (user text, headings)
  dimText:   rgb(139, 148, 158),  // #8b949e (meta, thought snippets)
  dimGray:   rgb(110, 118, 129),  // #6e7681 (tool hints, secondary info)
  darkLine:  rgb(48, 54, 61),     // #30363d (dividers)
  bgCode:    bgRgb(22, 27, 34),   // #161b22
};

// ─── Stepped Pyramid "A" Logo (Antigravity Pixel Art) ───
const LOGO_ROWS = [
  { text: '     ▄█▄     ', rgb: [239, 68, 68]   }, // Red
  { text: '    █████    ', rgb: [249, 115, 22]  }, // Orange
  { text: '   ██   ██   ', rgb: [234, 179, 8]   }, // Yellow
  { text: '  ██     ██  ', rgb: [34, 197, 94]   }, // Green
  { text: ' ███████████ ', rgb: [6, 182, 212]   }, // Cyan
  { text: ' █         █ ', rgb: [59, 130, 246]  }, // Blue
  { text: ' █         █ ', rgb: [168, 85, 247]  }, // Purple
];

const RAINBOW_PALETTE = [
  [239, 68, 68],   // Red
  [249, 115, 22],  // Orange
  [234, 179, 8],   // Yellow
  [34, 197, 94],   // Green
  [6, 182, 212],   // Cyan
  [59, 130, 246],  // Blue
  [168, 85, 247],  // Purple
  [236, 72, 153],  // Pink
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Token Management ───
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

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

function maskKey(k) {
  if (!k || k.length < 10) return '***';
  return k.slice(0, 7) + '…' + k.slice(-4);
}

function discoverAndSyncTokens() {
  const data = loadTokens();
  const knownKeys = new Set(data.tokens.map(t => t.key.trim()));
  let modified = false;

  // 1) Desktop/keys.json
  if (fs.existsSync(DESKTOP_KEYS)) {
    try {
      const dj = JSON.parse(fs.readFileSync(DESKTOP_KEYS, 'utf8'));
      const list = Array.isArray(dj.keys) ? dj.keys : [];
      for (const item of list) {
        const k = (item.key || item).trim();
        if (k && k.startsWith('sk-') && !knownKeys.has(k)) {
          const id = 'key_' + Math.random().toString(36).slice(2, 8);
          const name = item.name && item.name !== k ? item.name : `Токен Desktop (${maskKey(k)})`;
          data.tokens.push({ id, name, key: k });
          knownKeys.add(k);
          modified = true;
        }
      }
    } catch {}
  }

  // 2) ~/.dsh/.credentials.yaml
  if (fs.existsSync(DSH_CRED)) {
    try {
      const content = fs.readFileSync(DSH_CRED, 'utf8');
      const m = content.match(/BUYTOKENS_API_KEY:\s*(sk-[a-zA-Z0-9_\-]+)/);
      if (m && m[1] && !knownKeys.has(m[1].trim())) {
        const k = m[1].trim();
        const id = 'key_' + Math.random().toString(36).slice(2, 8);
        data.tokens.push({ id, name: 'DSH Credential', key: k });
        knownKeys.add(k);
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

// ─── Background DSH Web (100% silent, 0 extra windows) ───
async function isDshWebAlive() {
  try {
    const res = await fetch('http://127.0.0.1:3080', { signal: AbortSignal.timeout(1500) });
    return res.status > 0;
  } catch { return false; }
}

async function ensureDshWebSilent() {
  if (await isDshWebAlive()) return true;
  try {
    // Hidden background process with --no-open so browser NEVER pops up
    const child = spawn('dsh web --no-open', {
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (await isDshWebAlive()) return true;
    }
  } catch {}
  return false;
}

// ─── API Client (Tokify / DSH) ───
async function fetchKeyInfo(key) {
  try {
    const res = await fetch(`${BASE_URL}/public/key-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
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

async function* streamChat(messages, model, key) {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 16384,
    }),
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

// ─── Formatters & Renderers ───
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

// ─── ANIMATIONS ───

// 1) Boot Logo Rainbow Shimmer Animation
async function animateLogoAndHeader(token, model, keyInfo) {
  const cwd = process.cwd().replace(/\\/g, '/');
  const cols = process.stdout.columns || 80;

  let accountLabel = 'fffwwooo123@gmail.com (Google AI Pro)';
  if (token) {
    const prefix = keyInfo?.prefix || maskKey(token.key);
    accountLabel = `${token.name || prefix} (Tokify Pro)`;
  }

  let modelLabel = 'Gemini 3.8 Flash (High)';
  if (model) {
    modelLabel = model.includes('fable') ? `${model} (High)` : model;
  }

  const infoLines = [
    `${C.cyan}${C.bold}Antigravity CLI ${VERSION}${C.reset}`,
    `${C.dimText}${accountLabel}${C.reset}`,
    `${C.cyan}${modelLabel}${C.reset}`,
    `${C.dimGray}${cwd}${C.reset}`,
  ];

  console.clear();
  console.log('');

  const totalRows = Math.max(LOGO_ROWS.length, infoLines.length);

  // If TTY, play a smooth 4-frame rainbow wave animation across the logo!
  if (isTTY) {
    const frames = 4;
    for (let f = 0; f < frames; f++) {
      process.stdout.write('\x1b[H\n'); // move cursor to top
      for (let i = 0; i < totalRows; i++) {
        let logoPart = ' '.repeat(13);
        if (i < LOGO_ROWS.length) {
          const colorIdx = (i + f) % RAINBOW_PALETTE.length;
          logoPart = rgb(...RAINBOW_PALETTE[colorIdx]) + LOGO_ROWS[i].text + C.reset;
        }
        const infoPart = i < infoLines.length ? '  ' + infoLines[i] : '';
        console.log('  ' + logoPart + infoPart);
      }
      await sleep(45);
    }
  }

  // Final stabilized render
  process.stdout.write('\x1b[H\n');
  for (let i = 0; i < totalRows; i++) {
    const logoPart = i < LOGO_ROWS.length
      ? rgb(...LOGO_ROWS[i].rgb) + LOGO_ROWS[i].text + C.reset
      : ' '.repeat(13);
    const infoPart = i < infoLines.length ? '  ' + infoLines[i] : '';
    console.log('  ' + logoPart + infoPart);
  }

  console.log('');

  // 2) Animated Divider Drawing
  const dividerLen = Math.min(Math.max(cols - 2, 40), 90);
  if (isTTY) {
    const step = 8;
    for (let i = 0; i <= dividerLen; i += step) {
      process.stdout.write(`\r${C.darkLine}${'─'.repeat(i)}${C.reset}`);
      await sleep(6);
    }
    process.stdout.write(`\r${C.darkLine}${'─'.repeat(dividerLen)}${C.reset}\n\n`);
  } else {
    console.log(C.darkLine + '─'.repeat(dividerLen) + C.reset + '\n');
  }
}

// 3) Animated Tool Execution Badge
async function animateToolStep(actionText, detailText, durationMs = 350) {
  if (!isTTY) {
    console.log(`  ${C.green}● ${actionText} ${detailText || ''}${C.reset}`);
    return;
  }

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIdx = 0;
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    const frame = spinnerFrames[frameIdx++ % spinnerFrames.length];
    process.stdout.write(`\r\x1b[K  ${C.cyan}${frame}${C.reset} ${C.dimText}${actionText}…${C.reset}`);
    await sleep(40);
  }

  // Resolved state
  process.stdout.write(`\r\x1b[K  ${C.green}● ${actionText}${C.reset}`);
  if (detailText) {
    process.stdout.write(` ${C.dimGray}${detailText}${C.reset}`);
  }
  process.stdout.write('\n');
}

// ─── Inline Token Switcher (Everything in ONE window!) ───
async function promptInlineTokenSelect(store, currentToken) {
  console.log(`\n${C.bold}${C.snow}Выберите активный токен (без открытия новых окон):${C.reset}`);
  for (let i = 0; i < store.tokens.length; i++) {
    const t = store.tokens[i];
    const isCur = (t.id === currentToken.id);
    const mark = isCur ? `${C.green}● ${C.bold}` : `  `;
    console.log(`${mark}[${i + 1}] ${t.name}${C.reset} ${C.dimText}(${maskKey(t.key)})${C.reset}`);
  }
  console.log(`  [+] Ввести новый токен sk-…`);
  console.log(`  [0] Отмена\n`);
}

// ─── Main Chat Engine (Exportable for 1-window seamless integration) ───
async function runChat(options = {}) {
  let TOKEN_ID = options.tokenId || process.env.DSH_TOKEN_ID || '';
  let MODEL    = options.model   || process.env.DSH_MODEL    || '';
  const returnToMenu = Boolean(options.returnToMenu);

  if (isTTY) process.stdout.write(`\x1b]0;Antigravity CLI ${VERSION}\x07`);

  // Start background DSH Web silently in the background (0 windows)
  ensureDshWebSilent();

  const tokenStore = discoverAndSyncTokens();
  let currentToken = tokenStore.tokens.find(t => t.id === (TOKEN_ID || tokenStore.activeId)) || tokenStore.tokens[0];

  if (!currentToken) {
    console.error(`\n  ${C.red}✗ Токены не найдены!${C.reset}\n`);
    return;
  }

  // Sync token to DSH configs
  syncTokenToDsh(currentToken.key);

  const [availableModelsRaw, keyInfo] = await Promise.all([
    fetchModels(currentToken.key),
    fetchKeyInfo(currentToken.key),
  ]);

  const defaultModels = [
    'claude-fable-5.1',
    'claude-opus-5.5',
    'claude-fable-5',
    'claude-opus-5',
    'claude-opus-4.7',
    'gpt-6-astra',
    'gpt-6-sol',
  ];

  const availableModels = (availableModelsRaw && availableModelsRaw.length > 0)
    ? availableModelsRaw
    : defaultModels;

  let currentModel = MODEL;
  if (!currentModel) {
    if (availableModels.includes('claude-fable-5.1')) currentModel = 'claude-fable-5.1';
    else currentModel = availableModels[0];
  }

  let conversationHistory = [];
  let isBusy = false;

  // Run the animated logo & divider startup sequence
  await animateLogoAndHeader(currentToken, currentModel, keyInfo);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.cyan}${C.bold}> ${C.reset}`,
    historySize: 200,
  });

  const safePrompt = () => {
    if (!rl.closed) {
      try { rl.resume(); rl.prompt(); } catch {}
    }
  };

  safePrompt();

  return new Promise((resolve) => {
    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { safePrompt(); return; }

      isBusy = true;
      try {
        // ── Slash Commands ──
        if (input.startsWith('/')) {
          const [cmd, ...args] = input.split(/\s+/);
          const argStr = args.join(' ').trim();

          switch (cmd.toLowerCase()) {
            case '/help':
              console.log('');
              console.log(`${C.bold}${C.snow}Доступные команды (всё работает в этом окне):${C.reset}`);
              console.log(`  ${C.cyan}/plan <задача>${C.reset}  ${C.dimText}— Архитектурный план с анимацией инструментов${C.reset}`);
              console.log(`  ${C.cyan}/model [имя]${C.reset}    ${C.dimText}— Просмотр или переключение модели${C.reset}`);
              console.log(`  ${C.cyan}/tokens${C.reset}         ${C.dimText}— Переключение токенов прямо в чате${C.reset}`);
              console.log(`  ${C.cyan}/stats${C.reset}          ${C.dimText}— Баланс токенов с анимированной шкалой${C.reset}`);
              console.log(`  ${C.cyan}/web${C.reset}            ${C.dimText}— Проверить DSH Web в фоне (http://127.0.0.1:3080)${C.reset}`);
              console.log(`  ${C.cyan}/clear${C.reset}          ${C.dimText}— Очистить чат с перезапуском заставки${C.reset}`);
              if (returnToMenu) {
                console.log(`  ${C.cyan}/menu${C.reset}           ${C.dimText}— Вернуться в главное меню лаунчера${C.reset}`);
              }
              console.log(`  ${C.cyan}/exit${C.reset}           ${C.dimText}— Выход${C.reset}`);
              console.log('');
              safePrompt();
              return;

            case '/menu':
              if (returnToMenu) {
                rl.close();
                resolve('menu');
                return;
              }
              break;

            case '/tokens': {
              const store = discoverAndSyncTokens();
              await promptInlineTokenSelect(store, currentToken);
              safePrompt();
              return;
            }

            case '/token': {
              const store = discoverAndSyncTokens();
              const idx = parseInt(argStr, 10) - 1;
              if (!isNaN(idx) && store.tokens[idx]) {
                currentToken = store.tokens[idx];
                store.activeId = currentToken.id;
                saveTokens(store);
                syncTokenToDsh(currentToken.key);

                // Animated switch badge
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
                const found = availableModels.find(m => m.toLowerCase() === argStr.toLowerCase());
                if (found) {
                  currentModel = found;
                  await animateToolStep('Model Switched', currentModel, 200);
                  console.log('');
                } else {
                  console.log(`${C.red}✗ Модель не найдена: ${argStr}${C.reset}`);
                  console.log(`${C.dimText}Доступные: ${availableModels.join(', ')}${C.reset}\n`);
                }
              } else {
                console.log(`\n${C.bold}${C.snow}Доступные модели на ключе (${availableModels.length}):${C.reset}`);
                for (const m of availableModels) {
                  const activeMark = (m === currentModel) ? `${C.green}● ${C.bold}` : `  ${C.dimGray}`;
                  console.log(`${activeMark}${m}${C.reset}`);
                }
                console.log(`\n${C.dimText}Сменить: /model <имя>${C.reset}\n`);
              }
              safePrompt();
              return;

            case '/stats': {
              await animateToolStep('Querying Tokify Gateway', currentToken.name, 250);
              const info = await fetchKeyInfo(currentToken.key);
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
                console.log(`${C.green}● DSH Web запущен:${C.reset} ${C.cyan}http://127.0.0.1:3080/${C.reset}`);
              }
              console.log('');
              safePrompt();
              return;
            }

            case '/clear':
              conversationHistory = [];
              await animateLogoAndHeader(currentToken, currentModel, keyInfo);
              safePrompt();
              return;

            case '/exit':
            case '/quit':
              console.log(`\n${C.dimText}До встречи! 👋${C.reset}\n`);
              rl.close();
              resolve('exit');
              return;

            case '/plan':
              // Handled below
              break;

            default:
              console.log(`${C.red}Неизвестная команда. Введите /help для справки.${C.reset}\n`);
              safePrompt();
              return;
          }
        }

        // ── Plan Mode vs Standard Chat ──
        rl.pause();

        const isPlan = input.startsWith('/plan');
        const userPrompt = isPlan ? input.replace(/^\/plan\s*/i, '').trim() : input;

        if (!userPrompt) {
          console.log(`${C.yellow}Укажите задачу для планирования: /plan <описание>${C.reset}\n`);
          safePrompt();
          return;
        }

        let systemInstruction = 'You are a helpful and capable AI assistant. Answer questions clearly and accurately in the language used by the user.';
        if (isPlan) {
          systemInstruction =
            'You are an expert AI software architect and technical lead. ' +
            'Generate an exhaustive, highly detailed architectural plan and design document for the requested system. ' +
            'Include mathematical models, engineering specifications, subsystems breakdown, state diagrams, data structures, ' +
            'and explicitly state key decisions requiring user confirmation at the end. Use Russian language.';
        }

        conversationHistory.push({ role: 'user', content: userPrompt });
        if (conversationHistory.length > 30) conversationHistory = conversationHistory.slice(-30);

        const messages = [
          { role: 'system', content: systemInstruction },
          ...conversationHistory,
        ];

        // ── Dynamic Breathing Thought Animation ──
        const startTime = Date.now();
        let firstTokenReceived = false;
        let thinkingText = '';
        let responseText = '';

        // Breathing circle spinner
        const breathingFrames = ['○', '◔', '◑', '◕', '●', '◕', '◑', '◔'];
        let pulseIdx = 0;
        let timerId = null;

        if (isTTY) {
          timerId = setInterval(() => {
            if (!firstTokenReceived) {
              const elapsed = formatDuration(Date.now() - startTime);
              const symbol = breathingFrames[pulseIdx++ % breathingFrames.length];
              process.stdout.write(`\r\x1b[K  ${C.ice}${symbol}${C.reset} ${C.dimText}Thought for ${elapsed}…${C.reset}`);
            }
          }, 150);
        } else {
          process.stdout.write(`  ${C.dimText}○ Thinking…${C.reset}\n`);
        }

        try {
          for await (const delta of streamChat(messages, currentModel, currentToken.key)) {
            const reasoning = delta.reasoning_content || delta.reasoning || '';
            if (reasoning) {
              thinkingText += reasoning;
              continue;
            }

            const text = delta.content || '';
            if (!text) continue;

            // First content token arrived: finalize thinking phase with animated badges!
            if (!firstTokenReceived) {
              firstTokenReceived = true;
              if (timerId) clearInterval(timerId);

              const elapsed = formatDuration(Date.now() - startTime);
              if (isTTY) process.stdout.write('\r\x1b[K');

              const thoughtSnippet = thinkingText
                ? thinkingText.replace(/[\r\n]+/g, ' ').trim().slice(0, 95)
                : 'The environment is ready. Analyzing workspace and architectural dependencies...';
              console.log(`  ${C.dimText}○ Thought for ${elapsed} (${thoughtSnippet})${C.reset}`);

              // If /plan was used, render authentic Antigravity action badges!
              if (isPlan) {
                await animateToolStep('Ran (Get-Location)', '', 180);
                const safeName = userPrompt.slice(0, 30).toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '');
                const planFileName = `${safeName || 'project'}_plan.md`;
                await animateToolStep(`Edited 1 file (${planFileName})`, '(ctrl+o to expand)', 220);
                console.log(`  ${C.dimText}▸ Thought for 7s${C.reset}`);
              }

              console.log('');
            }

            responseText += text;
            process.stdout.write(text);
          }

          console.log('');

          if (!firstTokenReceived) {
            if (timerId) clearInterval(timerId);
            const elapsed = formatDuration(Date.now() - startTime);
            if (isTTY) process.stdout.write('\r\x1b[K');
            console.log(`  ${C.dimText}○ Thought for ${elapsed}${C.reset}\n`);
          }

          if (responseText) {
            conversationHistory.push({ role: 'assistant', content: responseText });

            if (isPlan) {
              try {
                const safeName = userPrompt.slice(0, 30).toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '');
                const planFile = path.join(process.cwd(), `${safeName || 'project'}_plan.md`);
                fs.writeFileSync(planFile, responseText, 'utf8');
              } catch {}
            }
          }

        } catch (err) {
          if (timerId) clearInterval(timerId);
          if (isTTY) process.stdout.write('\r\x1b[K');
          console.log(`\n  ${C.red}✗ Ошибка API: ${err.message}${C.reset}`);
          conversationHistory.pop();
        }

        console.log('');
        safePrompt();
      } finally {
        isBusy = false;
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

// If invoked directly from terminal / bat file:
if (require.main === module) {
  const argv = process.argv.slice(2);
  let tokenId = '';
  let model = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--token-id' && argv[i + 1]) tokenId = argv[++i];
    if (argv[i] === '--model'    && argv[i + 1]) model   = argv[++i];
  }
  runChat({ tokenId, model }).then(() => {
    process.exit(0);
  });
}

module.exports = { runChat, syncTokenToDsh, ensureDshWebSilent };
