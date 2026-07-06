# QueryHouse

QueryHouse is a Chrome-compatible MV3 extension that adds editor helpers to ClickHouse web interfaces.

It currently targets:

- `http://localhost/*`
- `http://127.0.0.1/*`
- `https://clickhouse.hamtadns.com/*`

## Features

- Detects SQL textareas on supported ClickHouse pages.
- Adds line numbers and a small statement action row.
- Shows `Run | +Tab | JSON` above completed statements and runs a single statement through the page's native Run button.
- Adds static ClickHouse SQL completions, including ClickHouse-specific keywords such as `FINAL`, `PREWHERE`, `QUALIFY`, `SAMPLE`, `LIMIT BY`, `SETTINGS`, and `FORMAT`.
- Colors SQL keywords without adding a statement background highlight.
- Toggles line comments with `Ctrl+/` for the current line or selected rows.
- Runs local diagnostics for obvious mistakes such as dangling commas, unclosed strings, unmatched brackets, duplicated semicolons, missing trailing semicolons, and invalid `FINAL AS alias` ordering.
- Runs parser-based validation with `@clickhouse/parser`.

## Development

Install dependencies:

```bash
npm install
```

Start WXT development mode:

```bash
npm run dev
```

Build the Chrome MV3 extension:

```bash
npm run build
```

The unpacked extension is generated at:

```text
.output/chrome-mv3
```

## Test in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `.output/chrome-mv3`.
5. Open a supported ClickHouse page.
6. After rebuilding, click the extension reload button in `chrome://extensions` and refresh the ClickHouse page.

## Validation

Run the full validation set before committing:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Project Map

- `entrypoints/content.ts`: mounts the content script.
- `src/content/app.ts`: coordinates editor detection, completions, diagnostics, run actions, and keyboard shortcuts.
- `src/content/autocomplete-ui.ts`: renders the completion popup.
- `src/content/run-statement-ui.ts`: renders per-statement Run actions.
- `src/editor/detect.ts`: detects supported ClickHouse SQL editors.
- `src/editor/textarea-adapter.ts`: adapts textarea behavior, line numbers, syntax coloring, diagnostics, line comments, and statement execution.
- `src/sql/completions.ts`: static ClickHouse completions.
- `src/sql/diagnostics.ts`: local syntax checks.
- `src/sql/parser-validator.ts`: `@clickhouse/parser` validation adapter.
- `src/sql/statements.ts`: SQL statement splitting and current-statement detection.
