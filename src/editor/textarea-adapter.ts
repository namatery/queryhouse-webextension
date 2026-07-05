import type { EditorAdapter, TextRange } from './types';

const STYLE_ID = 'queryhouse-editor-style';

function ensureStyles(ownerDocument: Document) {
  if (ownerDocument.getElementById(STYLE_ID)) {
    return;
  }

  const style = ownerDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .queryhouse-active-editor {
      box-shadow: inset 3px 0 0 #1a73e8 !important;
      outline: 1px solid rgba(26, 115, 232, 0.45) !important;
      outline-offset: 0 !important;
    }

    .queryhouse-highlight-layer {
      position: fixed;
      z-index: 2147483645;
      pointer-events: none;
      overflow: hidden;
      box-sizing: border-box;
      color: transparent;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid transparent;
    }

    .queryhouse-highlight-layer mark {
      color: transparent;
      background: rgba(26, 115, 232, 0.16);
      border-radius: 3px;
    }

    .queryhouse-diagnostics {
      position: fixed;
      z-index: 2147483646;
      max-width: min(520px, calc(100vw - 24px));
      padding: 8px 10px;
      border: 1px solid #f6c75b;
      border-radius: 6px;
      background: #fff8e1;
      color: #3c4043;
      font: 12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 6px 20px rgba(60, 64, 67, 0.18);
      white-space: pre-wrap;
    }
  `;
  ownerDocument.head.append(style);
}

export class TextareaAdapter implements EditorAdapter {
  readonly element: HTMLTextAreaElement;

  private currentQueryRange: TextRange | null = null;
  private readonly diagnostics: HTMLDivElement;
  private readonly highlightLayer: HTMLDivElement;
  private disposers: Array<() => void> = [];

  constructor(element: HTMLTextAreaElement) {
    this.element = element;
    ensureStyles(element.ownerDocument);
    this.highlightLayer = element.ownerDocument.createElement('div');
    this.highlightLayer.className = 'queryhouse-highlight-layer';
    this.highlightLayer.hidden = true;
    this.diagnostics = element.ownerDocument.createElement('div');
    this.diagnostics.className = 'queryhouse-diagnostics';
    this.diagnostics.hidden = true;
    element.ownerDocument.body.append(this.highlightLayer);
    element.ownerDocument.body.append(this.diagnostics);
    this.listen(['input', 'scroll'], () => this.renderHighlight());
    window.addEventListener('resize', this.renderHighlight);
    this.disposers.push(() => window.removeEventListener('resize', this.renderHighlight));
  }

  getText() {
    return this.element.value;
  }

  getCursor() {
    return this.element.selectionStart;
  }

  getSelection(): TextRange {
    return {
      start: this.element.selectionStart,
      end: this.element.selectionEnd
    };
  }

  replaceRange(range: TextRange, text: string) {
    const value = this.element.value;
    this.element.value = `${value.slice(0, range.start)}${text}${value.slice(range.end)}`;
    const cursor = range.start + text.length;
    this.element.setSelectionRange(cursor, cursor);
    this.element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  onChange(listener: () => void) {
    return this.listen(['input', 'change'], listener);
  }

  onCursor(listener: () => void) {
    return this.listen(['keyup', 'mouseup', 'focus', 'select'], listener);
  }

  getAnchorRect() {
    return this.element.getBoundingClientRect();
  }

  setCurrentQueryRange(range: TextRange | null) {
    this.currentQueryRange = range;
    this.element.classList.toggle('queryhouse-active-editor', range !== null);
    if (range) {
      this.element.dataset.queryhouseCurrentQuery = `${range.start}:${range.end}`;
    } else {
      delete this.element.dataset.queryhouseCurrentQuery;
    }
    this.renderHighlight();
  }

  setDiagnostics(messages: string[]) {
    if (messages.length === 0) {
      this.diagnostics.hidden = true;
      return;
    }

    const rect = this.element.getBoundingClientRect();
    this.diagnostics.textContent = messages.join('\n');
    this.diagnostics.style.left = `${Math.max(12, rect.left)}px`;
    this.diagnostics.style.top = `${Math.min(window.innerHeight - 48, rect.bottom + 8)}px`;
    this.diagnostics.hidden = false;
  }

  destroy() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.element.classList.remove('queryhouse-active-editor');
    this.highlightLayer.remove();
    this.diagnostics.remove();
  }

  private renderHighlight = () => {
    if (!this.currentQueryRange) {
      this.highlightLayer.hidden = true;
      return;
    }

    const value = this.element.value;
    const range = this.currentQueryRange;
    const rect = this.element.getBoundingClientRect();
    const style = window.getComputedStyle(this.element);
    Object.assign(this.highlightLayer.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      padding: style.padding,
      font: style.font,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      borderRadius: style.borderRadius
    });

    const before = escapeHtml(value.slice(0, range.start));
    const current = escapeHtml(value.slice(range.start, range.end)) || '&nbsp;';
    const after = escapeHtml(value.slice(range.end));
    this.highlightLayer.innerHTML = `${before}<mark>${current}</mark>${after}`;
    this.highlightLayer.scrollTop = this.element.scrollTop;
    this.highlightLayer.scrollLeft = this.element.scrollLeft;
    this.highlightLayer.hidden = false;
  };

  private listen(events: string[], listener: () => void) {
    events.forEach((event) => this.element.addEventListener(event, listener));
    const dispose = () => events.forEach((event) => this.element.removeEventListener(event, listener));
    this.disposers.push(dispose);
    return dispose;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[char] ?? char;
  });
}
