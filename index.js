#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  DSH Launcher & Token Manager (Single-Window Engine)
 *  • 100% Single-Window execution: absolutely NO popups or extra windows
 *  • Select, add, and manage Tokify / FunPay API tokens
 *  • Smooth animations and seamless transitions into Antigravity CLI
 *  • Background DSH Web silently runs on http://127.0.0.1:3080
 * ═══════════════════════════════════════════════════════════════════════ */
'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const { execSync, spawn } = require('child_process');

if (process.platform === 'win32') {
  try { execSync('chcp 65001', { stdio: 'ignore' }); } catch {}
}

const { runChat, syncTokenToDsh, ensureDshWebSilent } = require('./chat.js');

// ── Lazy load UI deps ──
let chalk, inquirer, ora, boxen, Table;
function loadDeps() {
  chalk    = require('chalk');
  inquirer = require('inquirer');
  ora      = require('ora');
  boxen    = require('boxen');
  Table    = require('cli-table3');
}

// ── Paths & Constants ──
const HOME         = os.homedir();
const TOKENS_DIR   = path.join(HOME, '.dsh-launcher');
const TOKENS_FILE  = path.join(TOKENS_DIR, 'tokens.json');
const DSH_DIR      = path.join(HOME, '.dsh');
const DSH_SETTINGS = path.join(DSH_DIR, 'settings.yaml');
const DSH_CRED     = path.join(DSH_DIR, '.credentials.yaml');
const DESKTOP_KEYS = path.join(HOME, 'Desktop', 'keys.json');
const BASE_URL     = (process.env.FUNPAY_BASE || 'https://tokify.sale').replace(/\/+$/, '');
const DSH_CRED_KEY = 'BUYTOKENS_API_KEY';
const DSH_DEFAULT_MODEL = 'claude-fable-5.1';
const DSH_PORT     = 3080;

// ── Helpers ──
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function maskKey(k) { return (!k || k.length < 10) ? '***' : k.slice(0, 7) + '…' + k.slice(-4); }

function fmtTok(n) {
  if (n == null) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' млрд';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' млн';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' тыс';
  return Number(n).toLocaleString('ru-RU');
}

// ── Token Storage & Discovery ──
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
  if (res.status === 400) throw new Error('Неверный формат (нужен sk-…)');
  if (!res.ok) throw new Error(`Сервер ответил кодом ${res.status}`);
  return await res.json();
}

async function fetchModels(key) {
  try {
    const res = await fetch(`${BASE_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await res.json();
    return (j.data || [])
      .filter(m => m && m.id && !/image|t2v|video/i.test(m.id))
      .map(m => ({ id: m.id, context: Number(m.context_window) || 524288 }));
  } catch { return null; }
}

async function autoDiscoverTokens() {
  const data = loadTokens();
  const known = new Set(data.tokens.map(t => t.key.trim()));
  let modified = false;

  // 1) Desktop/keys.json
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

  // 2) ~/.dsh/.credentials.yaml
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

// ── DSH Settings Synchronization ──
function syncDshSettingsFull(tokenKey, models) {
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

  const modelList = (models && models.length) ? models : [
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
}

// ── Check DSH Web ──
async function isDshWebAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${DSH_PORT}`, { signal: AbortSignal.timeout(1500) });
    return res.status > 0;
  } catch { return false; }
}

// ── UI Screens ──
function renderBanner(activeToken, webActive) {
  console.clear();
  const webMark = webActive ? chalk.green('● Активен в фоне (3080)') : chalk.yellow('○ Не запущен');
  const tokMark = activeToken
    ? `${chalk.green('●')} ${chalk.bold(activeToken.name)} ${chalk.dim(`(${maskKey(activeToken.key)})`)}`
    : chalk.red('○ Не выбран');

  console.log(boxen(
    `${chalk.cyan.bold('  Antigravity CLI · DeepSeek Harness & Tokify Gateway  ')}\n\n` +
    `  ${chalk.dim('Активный токен:')} ${tokMark}\n` +
    `  ${chalk.dim('DSH Web статус:')} ${webMark}\n` +
    `  ${chalk.dim('Режим работы:')}   ${chalk.green('Одно окно (без всплывающих окон)')}`,
    { padding: 1, margin: { top: 1, bottom: 1, left: 1, right: 1 }, borderStyle: 'round', borderColor: 'cyan' }
  ));
}

async function pause() {
  await inquirer.prompt([{ type: 'input', name: '_', message: chalk.dim('Нажмите Enter для продолжения…') }]);
}

// ── Single-Window Actions (0 extra windows created) ──
async function action1ClickLaunch() {
  const data = await autoDiscoverTokens();
  const active = data.tokens.find(t => t.id === data.activeId);

  if (!active) {
    console.log(chalk.red('\n  ✗ Сначала добавьте API-токен!\n'));
    await pause();
    return;
  }

  const spin = ora('Синхронизирую DSH и проверяю фоновый веб-сервер…').start();
  const models = await fetchModels(active.key);
  syncDshSettingsFull(active.key, models);
  await ensureDshWebSilent();
  spin.succeed('Готово! Переход в Antigravity CLI чат…');

  // Smooth transition: Launch directly in the CURRENT window!
  await runChat({ tokenId: active.id, returnToMenu: true });
}

async function actionSelectToken() {
  const data = await autoDiscoverTokens();
  if (!data.tokens.length) {
    console.log(chalk.yellow('\n  Список токенов пуст. Добавьте новый токен.\n'));
    await pause();
    return;
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
    type: 'list',
    name: 'chosenId',
    message: 'Выберите токен для работы:',
    pageSize: 15,
    choices,
  }]);

  if (chosenId === 'back') return;

  data.activeId = chosenId;
  saveTokens(data);

  const selected = data.tokens.find(t => t.id === chosenId);
  console.log(chalk.green(`\n  ✓ Активным выбран: ${chalk.bold(selected.name)} (${maskKey(selected.key)})`));

  syncDshSettingsFull(selected.key, null);

  const { launchNow } = await inquirer.prompt([{
    type: 'confirm',
    name: 'launchNow',
    message: 'Открыть CLI чат с этим токеном сейчас (в этом же окне)?',
    default: true,
  }]);

  if (launchNow) {
    await runChat({ tokenId: selected.id, returnToMenu: true });
  }
}

async function actionAddToken() {
  const { key } = await inquirer.prompt([{
    type: 'password',
    name: 'key',
    message: 'Введите API-ключ Tokify / FunPay (sk-…):',
    mask: '*',
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
    return;
  }

  const defaultName = info.label || `Токен ${maskKey(cleanKey)}`;
  const { name } = await inquirer.prompt([{
    type: 'input',
    name: 'name',
    message: 'Название для токена:',
    default: defaultName,
  }]);

  const data = loadTokens();
  const id = 'key_' + Math.random().toString(36).slice(2, 8);
  data.tokens.push({ id, name, key: cleanKey });
  data.activeId = id;
  saveTokens(data);

  syncDshSettingsFull(cleanKey, null);
  console.log(chalk.green(`\n  ✓ Токен сохранён и установлен как активный!\n`));

  const { launchNow } = await inquirer.prompt([{
    type: 'confirm',
    name: 'launchNow',
    message: 'Запустить CLI чат прямо сейчас (в этом же окне)?',
    default: true,
  }]);

  if (launchNow) {
    await runChat({ tokenId: id, returnToMenu: true });
  }
}

async function actionRunFunpaySetup() {
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
  console.log('');
  await pause();
}

async function actionStats() {
  const data = await autoDiscoverTokens();
  const active = data.tokens.find(t => t.id === data.activeId);
  if (!active) { console.log(chalk.red('\n  ✗ Нет активного токена!\n')); await pause(); return; }

  const spin = ora('Загружаю статистику…').start();
  try {
    const info = await verifyKey(active.key);
    spin.succeed('Готово');
    const Q = info.quota || {};
    const U = info.usage || {};
    const L = info.limits || {};

    console.log(chalk.bold('\n  Токен: ') + chalk.cyan(info.prefix + '…') + chalk.dim(` (${info.label || active.name})`));
    if (Q.total != null) {
      const used = Q.used || 0;
      const total = Q.total || 1;
      const pct = Math.min(100, (used / total) * 100).toFixed(1);
      const col = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
      const width = 24;
      const filled = Math.round((used / total) * width);
      const bar = chalk[col]('█'.repeat(filled)) + chalk.gray('·'.repeat(width - filled));
      console.log(`  Пакет токенов:   [${bar}] ${chalk[col](pct + '%')} · остаток ${chalk.bold(fmtTok(Q.remaining ?? 0))} из ${fmtTok(total)}`);
    } else {
      console.log('  Пакет токенов:   ' + chalk.dim('безлимит'));
    }
    if (L.rpm) console.log(chalk.dim(`  RPM лимит:       ${L.rpm} запросов/мин`));
    if (L.rpd) console.log(chalk.dim(`  RPD лимит:       ${U.today_requests || 0}/${L.rpd} сегодня`));
    console.log(chalk.dim(`  Всего запросов:  ${(U.total_requests || 0).toLocaleString()} · использовано токенов: ${fmtTok(U.total_tokens || 0)}`));
  } catch (e) {
    spin.fail(e.message);
  }
  console.log('');
  await pause();
}

async function actionModels() {
  const data = await autoDiscoverTokens();
  const active = data.tokens.find(t => t.id === data.activeId);
  if (!active) { console.log(chalk.red('\n  ✗ Нет активного токена!\n')); await pause(); return; }

  const spin = ora('Загружаю каталог моделей…').start();
  const models = await fetchModels(active.key);
  if (!models?.length) { spin.fail('Не удалось получить список моделей'); await pause(); return; }
  spin.succeed(`Найдено ${models.length} моделей`);

  const tbl = new Table({ head: ['Модель', 'Контекстное окно'], style: { head: ['cyan'] } });
  for (const m of models) {
    tbl.push([chalk.bold(m.id), chalk.dim(`${fmtTok(m.context)} токенов`)]);
  }
  console.log('\n' + tbl.toString() + '\n');
  await pause();
}

async function actionWebStatus() {
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
}

// ── Main Entrypoint (100% Single Window) ──
(async () => {
  try {
    loadDeps();
  } catch {
    console.log('Установка зависимостей…');
    execSync('cmd /c "npm install"', { cwd: __dirname, stdio: 'inherit' });
    loadDeps();
  }

  // Pre-boot silent DSH web in background immediately
  ensureDshWebSilent();

  for (;;) {
    const data = await autoDiscoverTokens();
    const active = data.tokens.find(t => t.id === data.activeId);
    const webActive = await isDshWebAlive();

    renderBanner(active, webActive);

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Что делаем (всё работает в этом окне):',
      pageSize: 15,
      choices: [
        { name: '🚀  [1] Запустить Antigravity CLI Чат (прямо здесь)', value: '1click' },
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
      case '1click': await action1ClickLaunch(); break;
      case 'select': await actionSelectToken(); break;
      case 'add':    await actionAddToken(); break;
      case 'funpay': await actionRunFunpaySetup(); break;
      case 'web':    await actionWebStatus(); break;
      case 'stats':  await actionStats(); break;
      case 'models': await actionModels(); break;
      case 'exit':
        console.log(chalk.dim('\n  До встречи! 👋\n'));
        process.exit(0);
    }
  }
})().catch(e => {
  console.error('Ошибка:', e.message || e);
  process.exit(1);
});
