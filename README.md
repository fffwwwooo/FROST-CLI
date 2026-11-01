<div align="center">

```
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀╔═[ TOKIFY  v2.0.0 ]══════════════════════════════════════╗
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║  ████████╗ ██████╗ ██╗  ██╗██╗███████╗██╗   ██╗         ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║  ╚══██╔══╝██╔═══██╗██║ ██╔╝██║██╔════╝╚██╗ ██╔╝         ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║     ██║   ██║   ██║█████╔╝ ██║█████╗   ╚████╔╝          ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║     ██║   ██║   ██║██╔═██╗ ██║██╔══╝    ╚██╔╝           ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║     ██║   ╚██████╔╝██║  ██╗██║██║        ██║     ██╗    ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀║     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝     ╚═╝    ║
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀╚═════════════════════════════════════════════════════════╝
```

# <samp>tokify.</samp>

**Autonomous AI Agent with Deep Reasoning & Cross-Platform System Access**

[![Release](https://img.shields.io/badge/Release-v2.0.0-388bfd?style=flat-square&logo=github)](https://github.com/fffwwwoo/FROST-CLI/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-0078D4?style=flat-square)](.)
[![Reasoning](https://img.shields.io/badge/Reasoning-16K_Deep_Thinking-f0935b?style=flat-square)](.)
[![i18n](https://img.shields.io/badge/Language-English_%7C_Russian-blue?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

</div>

---

## ⚡ About The Project

**tokify.** is a powerful, autonomous, cross-platform terminal AI agent and console client engineered for software engineering, system administration, and automation across **Windows, macOS, and Linux** with deep step-by-step reasoning (Chain-of-Thought).

Unlike sandboxed chat assistants, **tokify.** operates directly on your operating system: executing terminal commands (PowerShell on Windows, Bash/Zsh on macOS and Linux), reading, writing, and editing files, analyzing codebases, and automating complex workflows in real time.

---

## ✨ Key Features

- 🖥️ **Interface**:
  - **Pinned Session Tab Bar**: Session tabs remain permanently fixed in the top terminal row, never scrolling out of view during long outputs.
  - **Elevated Input Card**: Clean prompt with accent borders, working directory indicator, and contextual status hints.
  - **Full Mouse Support**: Switch session tabs with mouse clicks and scroll chat history smoothly with the mouse wheel.
  - **Collapsible Reasoning**: Collapsible thinking blocks (`Thought for Xs...`) and interactive step execution spinners.

- 🌐 **True Cross-Platform Access (Windows / macOS / Linux)**:
  - **Windows**: Direct command execution via PowerShell with UTF-8 / CP866 encoding handling and UTF-8 BOM script generation.
  - **macOS & Linux**: Native shell execution (`$SHELL`, `bash`, `zsh`), automatic `chmod +x` permissions on script creation.
  - **Universal Clipboard**: Native <kbd>Ctrl</kbd> + <kbd>V</kbd> paste across all platforms (`Get-Clipboard` on Windows, `pbpaste` on macOS, `wl-paste` / `xclip` / `xsel` on Linux).

- 🛡️ **Configurable System Access Modes**:
  - **Turbo Mode** — Autonomous script execution and file operations without manual prompts.
  - **Request Review Mode** — High-security mode requiring explicit user confirmation before executing any system command.
  - Quick toggle via <kbd>Ctrl</kbd> + <kbd>A</kbd>, <kbd>F4</kbd>, or `/mode`.

- 🌍 **Multi-Language Support (i18n)**:
  - **English (Default)**: Full UI localization, command descriptions, and English AI responses.
  - **Russian**: Complete Russian UI localization and Russian AI responses.
  - Instant language switching via `/lang` (interactive modal), `/lang [en|ru]`, or through the Command Palette (<kbd>Ctrl</kbd> + <kbd>P</kbd>).

- 📑 **Multitasking Sessions (Pinned Tabs)**:
  - Up to 9 independent tabs in a single console window.
  - Each session retains its own chat history, active AI model, reasoning power level, and scroll state.
  - Intelligent tab auto-naming based on the intent of your first prompt.
  - Swift navigation with <kbd>←</kbd> / <kbd>→</kbd> arrows, mouse clicks, or <kbd>Alt</kbd> + <kbd>1..9</kbd>.

- 🎨 **6 Built-in Color Themes**:
  - `Crimson Dark`, `Cyber Ice`, `Neon Emerald`, `Amber Gold`, `Deep Purple`, `Monokai Monochrome`.
  - Instant switching with <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>F3</kbd>, auto-saved to user settings.

- 📦 **Standalone Binaries & Zero-Dependency Run**:
  - Self-contained executable builds powered by Node.js Single Executable Application (SEA): `tokify.exe` on Windows, `tokify` on Linux and macOS.
  - Seamless integration with local DSH Web gateway (:3080) and token balance tracking.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>Mouse Wheel</kbd> | Smooth chat scroll up / down through long answers and history |
| <kbd>PgUp</kbd> / <kbd>PgDn</kbd> | Page-by-page scrolling through conversation history |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Fine-grained line scrolling (Esc returns immediately to bottom) |
| <kbd>←</kbd> / <kbd>→</kbd> | Switch between session tabs (when input line is empty) |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Open OpenCode Command Palette |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> *(or F4)* | Toggle Access Mode (`Turbo` ↔ `Request Review`) |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> *(or F3)* | Open Color Themes & UI palette modal |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> *(or F2)* | Cycle AI model for current session |
| <kbd>Tab</kbd> | Cycle reasoning power: High (16K) / Medium (8K) / Fast (4K) |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste text or code from system clipboard |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> *(or `+`)* | Create a new session tab |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close active session tab |
| <kbd>Alt</kbd> + <kbd>1</kbd> … <kbd>9</kbd> | Jump directly to session tab 1 through 9 |
| <kbd>Esc</kbd> | Dismiss modals / reset chat scroll to the very bottom |

---

## 💬 Built-in Slash Commands

| Command | Description |
| :--- | :--- |
| `/help` | Comprehensive cheatsheet of all shortcuts and commands |
| `/lang [en\|ru]` | Switch UI and AI language (English / Russian) |
| `/history` | Display complete session history digest with message log |
| `/mode [review\|turbo]` | Switch system access mode |
| `/theme [1-6]` | Switch or select UI color theme |
| `/model [name\|idx]` | Choose or cycle active AI model |
| `/power [1-3]` | Set reasoning level: 1 (High 16K), 2 (Medium 8K), 3 (Fast 4K) |
| `/tokens` | List and inspect all saved API tokens |
| `/token <number>` | Switch active API token |
| `/stats` | View token usage quota, remaining balance, and limits |
| `/web` | Check or start background DSH Web service (:3080) |
| `/tabs` | List all open tabs and active states |
| `/new [name]` | Create a new session tab |
| `/tab [1-9]` | Switch to a specific session tab |
| `/close [idx]` | Close a session tab |
| `/rename <name>` | Rename the active session tab |
| `/clear` | Clear conversation history for active tab |
| `/exit` | Exit application |

---

## 🚀 Installation & Quick Start

### Method 1: Download Pre-built Binary (Recommended)
Download the standalone executable for your operating system from [Releases](https://github.com/fffwwwoo/FROST-CLI/releases):
- **Windows**: `tokify.exe`
- **Linux**: `tokify-linux-x64` (`chmod +x tokify-linux-x64 && ./tokify-linux-x64`)
- **macOS**: `tokify-macos-x64` (`chmod +x tokify-macos-x64 && ./tokify-macos-x64`)

### Method 2: Run from Source
```bash
# Clone repository
git clone https://github.com/fffwwwoo/FROST-CLI.git tokify
cd tokify

# Install dependencies
npm install

# Start interactive chat
node app.js chat

# Or link globally:
npm link
tokify chat
```

### Build Standalone Executable on your machine:
```bash
node build.js
```
The build script automatically detects the host OS (Windows / Linux / macOS), bundles the project with `esbuild`, generates the Node.js SEA blob, and produces an executable binary in the `dist/` directory.

---

## 📄 License

Distributed under the [MIT](LICENSE) License.

<div align="center">
  <sub>crafted with precision • <b>tokify.</b> • 2026</sub>
</div>
