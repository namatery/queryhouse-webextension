import { afterEach, describe, expect, it } from 'vitest';
import { createQueryHouse } from './app';

describe('createQueryHouse autocomplete key handling', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('prevents the host editor from also handling Tab after accepting a suggestion', () => {
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'SQL query';
    textarea.rows = 8;
    textarea.value = 'SELE';
    textarea.setSelectionRange(4, 4);
    document.body.append(textarea);

    let hostTabHandlerCalled = false;
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        hostTabHandlerCalled = true;
        textarea.value += '    ';
      }
    });

    const queryHouse = createQueryHouse(document, {
      highlightCurrentQuery: false,
      autocomplete: true,
      localChecks: false,
      parserValidation: false,
      runCompletedStatement: false
    });
    queryHouse.mount();

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true
    });
    textarea.dispatchEvent(tabEvent);

    expect(textarea.value).toBe('SELECT');
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(hostTabHandlerCalled).toBe(false);

    queryHouse.destroy();
  });

  it('runs a completed statement without focusing that statement first', async () => {
    const form = document.createElement('form');
    const textarea = document.createElement('textarea');
    const hostRun = document.createElement('button');
    const originalSql = 'SELECT 1;\nSELECT 2;';
    let submittedSql = '';

    textarea.placeholder = 'SQL query';
    textarea.rows = 8;
    textarea.value = originalSql;
    textarea.setSelectionRange(0, 0);
    hostRun.type = 'button';
    hostRun.textContent = 'Run';
    hostRun.addEventListener('click', () => {
      submittedSql = textarea.value;
    });
    form.append(textarea, hostRun);
    document.body.append(form);

    const queryHouse = createQueryHouse(document, {
      highlightCurrentQuery: true,
      autocomplete: false,
      localChecks: false,
      parserValidation: false,
      runCompletedStatement: true
    });
    queryHouse.mount();

    const queryHouseRuns = document.querySelectorAll<HTMLButtonElement>('.queryhouse-run-statement');
    queryHouseRuns[1]?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(queryHouseRuns).toHaveLength(2);
    expect(submittedSql).toBe('SELECT 2;');
    expect(textarea.value).toBe(originalSql);

    queryHouse.destroy();
  });

  it('marks blank spacer rows before later statements as unnumbered action rows', () => {
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'SQL query';
    textarea.rows = 8;
    textarea.value = 'SELECT 1;\n\nSELECT 2;';
    document.body.append(textarea);

    const queryHouse = createQueryHouse(document, {
      highlightCurrentQuery: true,
      autocomplete: false,
      localChecks: false,
      parserValidation: false,
      runCompletedStatement: true
    });
    queryHouse.mount();

    expect(document.querySelector('.queryhouse-line-numbers')?.textContent).toBe('\n1\n\n2');

    queryHouse.destroy();
  });

  it('comments selected lines on Ctrl+/', () => {
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'SQL query';
    textarea.rows = 8;
    textarea.value = 'SELECT 1;\nSELECT 2;';
    textarea.setSelectionRange(0, textarea.value.length);
    document.body.append(textarea);

    let hostShortcutCalled = false;
    textarea.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === '/') {
        hostShortcutCalled = true;
      }
    });

    const queryHouse = createQueryHouse(document, {
      highlightCurrentQuery: true,
      autocomplete: false,
      localChecks: false,
      parserValidation: false,
      runCompletedStatement: false
    });
    queryHouse.mount();

    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    textarea.dispatchEvent(event);

    expect(textarea.value).toBe('-- SELECT 1;\n-- SELECT 2;');
    expect(event.defaultPrevented).toBe(true);
    expect(hostShortcutCalled).toBe(false);

    queryHouse.destroy();
  });
});
