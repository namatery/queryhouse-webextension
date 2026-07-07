# Agent Guide

Last reviewed: 2026-07-06

## Project Snapshot

QueryHouse is a Chrome-compatible MV3 extension built with WXT, React 19, and TypeScript. It enhances textarea-based ClickHouse SQL editors on configured hosts without replacing the host page editor.

The extension currently targets:

- `http://localhost/*`
- `http://127.0.0.1/*`
- `https://clickhouse.hamtadns.com/*`

Keep the content-script match list, WXT manifest host permissions, and README supported pages in sync when host support changes.

## Commands

Use npm. The lockfile is `package-lock.json`.

```bash
npm install
npm run dev
npm run build
npm test
npm run typecheck
npm run lint
```

Run the full validation set before finishing behavioral changes:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Notes:

- `npm test` and `npm run typecheck` run `wxt prepare` first, which may update generated WXT files.
- Build output lives in `.output/chrome-mv3`.
- Do not edit `node_modules`, `.wxt`, or `.output` by hand.

## Repository Map

- `entrypoints/content.ts` mounts QueryHouse as the WXT content script.
- `entrypoints/popup/` contains the React popup and its styles.
- `src/content/app.ts` coordinates editor detection, feature flags, autocomplete, diagnostics, statement run actions, and keyboard shortcuts.
- `src/content/autocomplete-ui.ts` renders the completion popup as host-page DOM.
- `src/content/run-statement-ui.ts` renders per-statement Run buttons as host-page DOM.
- `src/editor/detect.ts` gates supported URLs and chooses the best textarea candidate.
- `src/editor/textarea-adapter.ts` adapts textarea behavior, overlays syntax highlighting, dispatches host input events, toggles comments, and runs selected statements through the host page Run button.
- `src/editor/types.ts` defines the editor adapter contract.
- `src/sql/completions.ts` stores static ClickHouse completions.
- `src/sql/diagnostics.ts` runs lightweight local SQL diagnostics.
- `src/sql/parser-validator.ts` adapts `@clickhouse/parser`.
- `src/sql/statements.ts` scans SQL into executable statements while respecting strings and comments.
- `src/**/*.test.ts` contains Vitest/jsdom tests.

## Architecture Rules

- Preserve the host textarea as the source of truth. QueryHouse overlays UI and temporarily writes values only when needed for host interaction.
- Do not replace the ClickHouse editor with a custom editor unless the project direction explicitly changes.
- Always dispatch appropriate `InputEvent`s when programmatically changing textarea values so host frameworks observe updates.
- Keep DOM additions clearly namespaced with `queryhouse-*` classes and data attributes.
- Use fixed-position overlays carefully; they must follow textarea scroll, resize, font, padding, line height, and viewport bounds.
- Clean up every event listener and injected DOM node in `destroy()` paths.
- Avoid broad host-page selectors. Detection and Run-button discovery should remain conservative and score-based.
- Keep feature logic separable: content orchestration in `src/content`, textarea behavior in `src/editor`, SQL parsing/checking in `src/sql`.

## TypeScript And Style

- The project is ESM (`"type": "module"`).
- TypeScript is strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.
- Prefer explicit types for public contracts and exported helpers.
- Keep helpers small and deterministic where possible, especially in `src/sql`.
- Use browser-safe APIs in extension/runtime code; tests run under jsdom.
- Follow the existing style: two-space indentation, semicolons, single quotes, and named exports for reusable modules.
- Use the `@/*` alias only when it improves clarity; existing source often uses relative imports.

## Testing Expectations

Add or update focused tests when changing behavior.

- SQL scanner changes: update `src/sql/statements.test.ts` for semicolons, strings, escaped quotes, comments, and cursor placement.
- Local diagnostics changes: update `src/sql/diagnostics.test.ts` for both warning/error cases and allowed valid SQL.
- Parser integration changes: update `src/sql/parser-validator.test.ts`.
- Completion changes: update `src/sql/completions.test.ts` for matching, ranking, and ClickHouse-specific terms.
- Editor adapter changes: update `src/editor/textarea-adapter.test.ts` for DOM cleanup, syntax overlays, comment toggling, selection preservation, and host input events.
- App orchestration or shortcut changes: update `src/content/app.test.ts`.
- URL or editor detection changes: update `src/editor/detect.test.ts`.

For UI changes that jsdom cannot prove, also build the extension and manually load `.output/chrome-mv3` in Chrome via `chrome://extensions`.

## Browser Extension Notes

- WXT config is in `wxt.config.ts`; content-script matches are in `entrypoints/content.ts`.
- The popup is currently a small static React status view, not the control surface for feature state.
- Manifest permissions are intentionally narrow. Do not add permissions unless a feature requires them.
- Content UI runs inside arbitrary host pages. CSS must be scoped, resilient, and avoid global resets.
- Use high `z-index` values only for QueryHouse floating controls that must sit above host UI.
- Keep accessibility basics intact for injected buttons: use real buttons, prevent unwanted textarea focus loss on `mousedown`, and preserve keyboard flows.

## Common Change Patterns

- New ClickHouse completion: add the item in `src/sql/completions.ts` and cover prefix behavior in `src/sql/completions.test.ts`.
- New local SQL warning: add deterministic scanner/regex logic in `src/sql/diagnostics.ts` and include positive and negative tests.
- New supported host: update `wxt.config.ts`, `entrypoints/content.ts`, `src/editor/detect.ts` if needed, `README.md`, and detection tests.
- Statement execution behavior: keep `runStatement` restoring the original textarea value and selection after clicking the host Run button.
- Overlay layout changes: test padding restoration and DOM cleanup, then manually inspect in Chrome because jsdom has limited layout fidelity.

## Release/Validation Checklist

Before considering a change complete:

- Source files are scoped to the requested behavior.
- Generated artifacts are not manually edited.
- Tests cover the changed behavior and relevant regression cases.
- `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass, or any skipped command is explicitly reported.
- README and this guide are updated when commands, supported hosts, architecture, or workflows change.
