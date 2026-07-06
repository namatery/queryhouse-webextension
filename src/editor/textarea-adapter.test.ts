import { afterEach, describe, expect, it } from 'vitest';
import { TextareaAdapter } from './textarea-adapter';

describe('TextareaAdapter line numbers', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders line numbers beside the textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;\nSELECT 2;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const lineNumbers = document.querySelector('.queryhouse-line-numbers');

    expect(lineNumbers?.textContent).toBe('1\n2');
    expect(textarea.style.paddingLeft).not.toBe('');

    adapter.destroy();
  });

  it('updates line numbers when the textarea changes', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    textarea.value = 'SELECT 1;\nSELECT 2;\nSELECT 3;';
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(document.querySelector('.queryhouse-line-numbers')?.textContent).toBe('1\n2\n3');

    adapter.destroy();
  });

  it('removes line numbers and restores padding on destroy', () => {
    const textarea = document.createElement('textarea');
    textarea.style.paddingLeft = '12px';
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    adapter.destroy();

    expect(document.querySelector('.queryhouse-line-numbers')).toBeNull();
    expect(textarea.style.paddingLeft).toBe('12px');
  });
});
