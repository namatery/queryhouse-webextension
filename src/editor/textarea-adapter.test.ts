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

    expect(lineNumbers?.textContent).toBe('1\n2\n3');
    expect(textarea.style.paddingLeft).not.toBe('');
    expect(textarea.style.paddingTop).not.toBe('');

    adapter.destroy();
  });

  it('updates line numbers when the textarea changes', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    textarea.value = 'SELECT 1;\nSELECT 2;\nSELECT 3;';
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(document.querySelector('.queryhouse-line-numbers')?.textContent).toBe('1\n2\n3\n4');

    adapter.destroy();
  });

  it('reserves exactly one editor line above SQL for statement actions', () => {
    const textarea = document.createElement('textarea');
    textarea.style.paddingTop = '4px';
    textarea.style.lineHeight = '19px';
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const lineNumbers = document.querySelector<HTMLElement>('.queryhouse-line-numbers');

    expect(textarea.style.paddingTop).toBe('23px');
    expect(lineNumbers?.style.paddingTop).toBe('4px');
    expect(lineNumbers?.style.lineHeight).toBe('19px');

    adapter.destroy();
  });

  it('removes line numbers and restores padding on destroy', () => {
    const textarea = document.createElement('textarea');
    textarea.style.paddingLeft = '12px';
    textarea.style.paddingTop = '10px';
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    adapter.destroy();

    expect(document.querySelector('.queryhouse-line-numbers')).toBeNull();
    expect(textarea.style.paddingLeft).toBe('12px');
    expect(textarea.style.paddingTop).toBe('10px');
  });
});

describe('TextareaAdapter syntax highlighting', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('colors keywords without marking the current statement background', () => {
    const textarea = document.createElement('textarea');
    textarea.value = "SELECT value FROM events WHERE label = 'SELECT';";
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    adapter.setCurrentQueryRange({ start: 0, end: textarea.value.length });
    const syntaxLayer = document.querySelector('.queryhouse-highlight-layer');

    expect(syntaxLayer?.querySelector('mark')).toBeNull();
    expect(syntaxLayer?.querySelectorAll('.queryhouse-syntax-keyword')).toHaveLength(3);
    expect(syntaxLayer?.innerHTML).toContain('<span class="queryhouse-syntax-keyword">SELECT</span>');
    expect(syntaxLayer?.innerHTML).toContain("'SELECT'");

    adapter.destroy();
  });

  it('colors commented ranges green without coloring keywords inside comments', () => {
    const textarea = document.createElement('textarea');
    textarea.value = '-- SELECT 1;\n/* FROM events */\nSELECT value;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector('.queryhouse-highlight-layer');
    const comments = syntaxLayer?.querySelectorAll('.queryhouse-syntax-comment');

    expect(comments).toHaveLength(2);
    expect(comments?.[0]?.textContent).toBe('-- SELECT 1;');
    expect(comments?.[1]?.textContent).toBe('/* FROM events */');
    expect(comments?.[0]?.querySelector('.queryhouse-syntax-keyword')).toBeNull();
    expect(syntaxLayer?.querySelectorAll('.queryhouse-syntax-keyword')).toHaveLength(1);

    adapter.destroy();
  });
});

describe('TextareaAdapter line comments', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('comments the current line', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;\nSELECT 2;';
    textarea.setSelectionRange(textarea.value.indexOf('2'), textarea.value.indexOf('2'));
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    adapter.toggleLineComment();

    expect(textarea.value).toBe('SELECT 1;\n-- SELECT 2;');

    adapter.destroy();
  });

  it('comments and uncomments selected lines', () => {
    const textarea = document.createElement('textarea');
    textarea.value = '  SELECT 1;\n  SELECT 2;\nSELECT 3;';
    textarea.setSelectionRange(0, textarea.value.indexOf('\nSELECT 3;'));
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    adapter.toggleLineComment();

    expect(textarea.value).toBe('  -- SELECT 1;\n  -- SELECT 2;\nSELECT 3;');

    textarea.setSelectionRange(0, textarea.value.indexOf('\nSELECT 3;'));
    adapter.toggleLineComment();

    expect(textarea.value).toBe('  SELECT 1;\n  SELECT 2;\nSELECT 3;');

    adapter.destroy();
  });
});
