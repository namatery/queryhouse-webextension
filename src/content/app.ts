import { detectSqlEditor } from '../editor/detect';
import type { EditorAdapter } from '../editor/types';
import { createAutocompleteController } from './autocomplete-ui';
import { getCompletions } from '../sql/completions';
import { runLocalDiagnostics } from '../sql/diagnostics';
import { runParserValidation } from '../sql/parser-validator';
import { findCurrentStatement } from '../sql/statements';

const VALIDATION_DELAY_MS = 250;

export type FeatureFlags = {
  highlightCurrentQuery: boolean;
  autocomplete: boolean;
  localChecks: boolean;
  parserValidation: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  highlightCurrentQuery: true,
  autocomplete: true,
  localChecks: true,
  parserValidation: true
};

export function createQueryHouse(ownerDocument: Document, flags: FeatureFlags = DEFAULT_FLAGS) {
  let adapter: EditorAdapter | null = null;
  let validationTimer: number | undefined;
  const autocomplete = createAutocompleteController(ownerDocument);
  const disposers: Array<() => void> = [];

  function mount() {
    adapter = detectSqlEditor(ownerDocument);
    if (!adapter) {
      return;
    }

    const refresh = () => {
      refreshHighlight();
      refreshAutocomplete();
      scheduleValidation();
    };

    disposers.push(adapter.onChange(refresh));
    disposers.push(adapter.onCursor(refresh));
    adapter.element.addEventListener('keydown', handleKeydown, true);
    disposers.push(() => adapter?.element.removeEventListener('keydown', handleKeydown, true));
    refresh();
  }

  function refreshHighlight() {
    if (!adapter || !flags.highlightCurrentQuery) {
      return;
    }

    adapter.setCurrentQueryRange(findCurrentStatement(adapter.getText(), adapter.getCursor()));
  }

  function refreshAutocomplete() {
    if (!adapter || !flags.autocomplete) {
      autocomplete.hide();
      return;
    }

    const result = getCompletions(adapter.getText(), adapter.getCursor());
    if (!result) {
      autocomplete.hide();
      return;
    }

    autocomplete.show(result, adapter.getAnchorRect(), (item) => {
      adapter?.replaceRange(result.range, item.insertText);
      autocomplete.hide();
      refreshHighlight();
      scheduleValidation();
    });
  }

  function scheduleValidation() {
    if (!adapter) {
      return;
    }

    window.clearTimeout(validationTimer);
    validationTimer = window.setTimeout(async () => {
      if (!adapter) {
        return;
      }

      const sql = adapter.getText();
      const diagnostics = flags.localChecks ? runLocalDiagnostics(sql) : [];
      const parserDiagnostics = flags.parserValidation ? await runParserValidation(sql) : [];
      adapter.setDiagnostics([...diagnostics, ...parserDiagnostics].map((diagnostic) => diagnostic.message));
    }, VALIDATION_DELAY_MS);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (autocomplete.handleKeydown(event)) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  function destroy() {
    window.clearTimeout(validationTimer);
    disposers.forEach((dispose) => dispose());
    disposers.length = 0;
    autocomplete.destroy();
    adapter?.destroy();
    adapter = null;
  }

  return { mount, destroy };
}
