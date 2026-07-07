import { afterEach, describe, expect, it } from 'vitest';
import { TextareaAdapter } from './textarea-adapter';

describe('TextareaAdapter editor overlays', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('does not render line numbers beside the textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.style.paddingLeft = '12px';
    textarea.style.paddingTop = '10px';
    textarea.value = 'SELECT 1;\nSELECT 2;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);

    expect(document.querySelector('.queryhouse-line-numbers')).toBeNull();
    expect(textarea.style.paddingLeft).toBe('12px');
    expect(textarea.style.paddingTop).toBe('10px');

    adapter.destroy();
  });

  it('keeps textarea padding unchanged after input updates', () => {
    const textarea = document.createElement('textarea');
    textarea.style.paddingLeft = '12px';
    textarea.style.paddingTop = '10px';
    textarea.value = 'SELECT 1;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    textarea.value = 'SELECT 1;\n\nSELECT 2;';
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(document.querySelector('.queryhouse-line-numbers')).toBeNull();
    expect(textarea.style.paddingLeft).toBe('12px');
    expect(textarea.style.paddingTop).toBe('10px');

    adapter.destroy();
  });

  it('preserves normal line height for the syntax overlay', () => {
    const textarea = document.createElement('textarea');
    textarea.style.fontSize = '20px';
    textarea.style.lineHeight = 'normal';
    textarea.value = 'SELECT 1;\n\n\nSELECT 2;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    expect(syntaxLayer?.style.lineHeight).toBe('normal');

    adapter.destroy();
  });

  it('keeps blank highlight rows represented in the overlay content', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;\n\n\n';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    expect(syntaxLayer?.textContent).toBe('SELECT 1;\n\u200b\n\u200b\n\u200b');

    adapter.destroy();
  });

  it('uses native textarea rendering while text is selected', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT 1;\nSELECT 2;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    textarea.setSelectionRange(0, 8);
    textarea.dispatchEvent(new Event('select'));

    expect(textarea.classList.contains('queryhouse-syntax-editor')).toBe(false);
    expect(syntaxLayer?.hidden).toBe(true);

    textarea.setSelectionRange(8, 8);
    textarea.dispatchEvent(new Event('select'));

    expect(textarea.classList.contains('queryhouse-syntax-editor')).toBe(true);
    expect(syntaxLayer?.hidden).toBe(false);

    adapter.destroy();
  });
});

describe('TextareaAdapter syntax highlighting', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.querySelectorAll('.queryhouse-test-theme').forEach((element) => element.remove());
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

  it('matches textarea text flow metrics on the syntax layer', () => {
    const textarea = document.createElement('textarea');
    textarea.wrap = 'off';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '15px';
    textarea.style.fontWeight = '600';
    textarea.style.borderTop = '3px solid red';
    textarea.style.borderRight = '4px solid red';
    textarea.style.borderBottom = '5px solid red';
    textarea.style.borderLeft = '6px solid red';
    textarea.style.tabSize = '4';
    textarea.style.textIndent = '2px';
    textarea.style.textTransform = 'uppercase';
    textarea.value = '\tSELECT value;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    expect(syntaxLayer?.style.fontFamily).toBe('monospace');
    expect(syntaxLayer?.style.fontSize).toBe('15px');
    expect(syntaxLayer?.style.fontWeight).toBe('600');
    expect(syntaxLayer?.style.whiteSpace).toBe('pre');
    expect(syntaxLayer?.style.overflowWrap).toBe('normal');
    expect(syntaxLayer?.style.tabSize).toBe('4');
    expect(syntaxLayer?.style.textIndent).toBe('2px');
    expect(syntaxLayer?.style.textTransform).toBe('uppercase');
    expect(syntaxLayer?.style.borderTop).toBe('3px solid transparent');
    expect(syntaxLayer?.style.borderLeft).toBe('6px solid transparent');

    adapter.destroy();
  });

  it('uses readable overlay colors when the host editor is dark', () => {
    const textarea = document.createElement('textarea');
    textarea.style.color = 'rgb(229, 231, 235)';
    textarea.style.backgroundColor = 'rgb(17, 24, 39)';
    textarea.value = '-- comment\nSELECT value;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    expect(textarea.style.getPropertyValue('--queryhouse-editor-text-color')).toBe('#f8fafc');
    expect(syntaxLayer?.style.getPropertyValue('--queryhouse-editor-text-color')).toBe('#f8fafc');
    expect(syntaxLayer?.style.getPropertyValue('--queryhouse-editor-keyword-color')).toBe('#facc15');
    expect(syntaxLayer?.style.getPropertyValue('--queryhouse-editor-comment-color')).toBe('#4ade80');

    adapter.destroy();
  });

  it('updates overlay colors when the host theme changes', async () => {
    const style = document.createElement('style');
    style.className = 'queryhouse-test-theme';
    style.textContent = `
      textarea {
        color: rgb(17, 24, 39);
        background-color: rgb(255, 255, 255);
      }

      html.dark textarea {
        color: rgb(229, 231, 235);
        background-color: rgb(17, 24, 39);
      }
    `;
    document.head.append(style);
    const textarea = document.createElement('textarea');
    textarea.value = 'SELECT value;';
    document.body.append(textarea);

    const adapter = new TextareaAdapter(textarea);
    const syntaxLayer = document.querySelector<HTMLElement>('.queryhouse-highlight-layer');

    expect(syntaxLayer?.style.getPropertyValue('--queryhouse-editor-keyword-color')).toBe('#0000ff');

    document.documentElement.classList.add('dark');
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(syntaxLayer?.style.getPropertyValue('--queryhouse-editor-keyword-color')).toBe('#facc15');

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
