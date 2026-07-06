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
      parserValidation: false
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
});
