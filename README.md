<p align="center">
  <img src="./public/header.png" alt="QueryHouse - Open-source SQL toolkit for the ClickHouse web interface" width="100%">
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-ffc400?style=for-the-badge&logo=googlechrome&logoColor=111111">
  <img alt="WXT" src="https://img.shields.io/badge/WXT-0.20-111111?style=for-the-badge">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111111">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff">
  <img alt="ClickHouse" src="https://img.shields.io/badge/ClickHouse-SQL-ffcc01?style=for-the-badge">
</p>

<h1 align="center">QueryHouse</h1>

<p align="center">
  Open-source SQL editor helpers for the ClickHouse web interface.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#install-locally">Install locally</a> ·
  <a href="#test-in-chrome">Test in Chrome</a> ·
  <a href="#development">Development</a> ·
  <a href="#contribute">Contribute</a>
</p>

## Why QueryHouse

QueryHouse is a Chrome-compatible MV3 extension that improves textarea-based ClickHouse SQL editors without replacing the host page. It adds line numbers, per-statement actions, SQL completions, syntax coloring, comment shortcuts, and validation while still running queries through the page's native controls.

## Site Access

QueryHouse does not run on a fixed list of domains. Open the extension popup on any `http` or `https` ClickHouse web interface and click **Enable on this site**. Chrome asks for access to that site, then QueryHouse stores the origin and injects only on enabled sites.

## Features

- 🔎 **SQL editor detection** - Detects supported ClickHouse SQL textareas and mounts QueryHouse only where it can help.
- 🔢 **Line numbers** - Adds a stable gutter with line numbers and unnumbered action rows for statement controls.
- ▶️ **Run single statement** - Shows `Run | +Tab | JSON` above completed statements and executes one statement through the host page's Run button.
- 🧠 **Static ClickHouse autocomplete** - Suggests ClickHouse SQL keywords, including `FINAL`, `PREWHERE`, `QUALIFY`, `SAMPLE`, `LIMIT BY`, `SETTINGS`, and `FORMAT`.
- 🎨 **Syntax coloring** - Colors SQL keywords and comments without adding a blue current-statement background.
- 💬 **Comment shortcut** - Toggles `--` line comments with `Ctrl+/` or `Cmd+/` for the current line or selected rows.
- 🩺 **Local diagnostics** - Catches obvious mistakes such as dangling commas, unclosed strings, unmatched brackets, duplicated semicolons, missing trailing semicolons, and invalid `FINAL AS alias` ordering.
- ✅ **Parser validation** - Runs parser-based validation with `@clickhouse/parser`.

## Install Locally

Clone the project and install dependencies:

```bash
npm install
```

Build the unpacked Chrome extension:

```bash
npm run build
```

The build output is generated at:

```text
.output/chrome-mv3
```

## Test In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `.output/chrome-mv3`.
5. Open a ClickHouse web interface.
6. Open the QueryHouse popup and click Enable on this site.
7. After rebuilding, click the extension reload button in `chrome://extensions` and refresh the ClickHouse page.

## Development

Start WXT development mode:

```bash
npm run dev
```

Build the Chrome MV3 extension:

```bash
npm run build
```

Run the full validation set before committing:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Contribute

Contributions are welcome. Please keep changes focused and run the validation commands before opening a pull request.

- Fork the repository and create a branch for your change.
- Install dependencies with `npm install`.
- Make your changes with matching tests where behavior changes.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Open a pull request with a short summary and any testing notes.
