import type { EditorAdapter, TextRange } from './types';
import { getDocumentColorMode, getUsesDarkSurface, isTransparentColor, listenForThemeChanges } from '../theme';

const STYLE_ID = 'queryhouse-editor-style';
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;
const SQL_KEYWORDS = new Set([
  'ADD',
  'ALTER',
  'AND',
  'ANTI',
  'ANY',
  'ARRAY',
  'AS',
  'ASC',
  'ASOF',
  'BETWEEN',
  'BY',
  'CASE',
  'CREATE',
  'CROSS',
  'DATABASE',
  'DELETE',
  'DESC',
  'DESCRIBE',
  'DISTINCT',
  'DROP',
  'ELSE',
  'END',
  'EXCEPT',
  'EXISTS',
  'FINAL',
  'FORMAT',
  'FROM',
  'FULL',
  'GLOBAL',
  'GROUP',
  'HAVING',
  'IF',
  'ILIKE',
  'IN',
  'INNER',
  'INSERT',
  'INTERSECT',
  'INTO',
  'IS',
  'JOIN',
  'LEFT',
  'LIKE',
  'LIMIT',
  'NOT',
  'NULL',
  'OFFSET',
  'ON',
  'OPTIMIZE',
  'OR',
  'ORDER',
  'OUTER',
  'PREWHERE',
  'QUALIFY',
  'REPLACE',
  'RIGHT',
  'SAMPLE',
  'SELECT',
  'SEMI',
  'SET',
  'SETTINGS',
  'SHOW',
  'TABLE',
  'THEN',
  'UNION',
  'UPDATE',
  'USE',
  'USING',
  'WHEN',
  'WHERE',
  'WINDOW',
  'WITH'
]);

function ensureStyles(ownerDocument: Document) {
  if (ownerDocument.getElementById(STYLE_ID)) {
    return;
  }

  const style = ownerDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .queryhouse-active-editor {
      outline: 1px solid rgba(148, 163, 184, 0.45) !important;
      outline-offset: 0 !important;
    }

    .queryhouse-syntax-editor {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      caret-color: var(--queryhouse-editor-text-color, #111827) !important;
    }

    .queryhouse-highlight-layer {
      position: fixed;
      z-index: 2147483645;
      pointer-events: none;
      overflow: hidden;
      box-sizing: border-box;
      color: var(--queryhouse-editor-text-color, #111827);
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid transparent;
    }

    .queryhouse-syntax-keyword {
      color: var(--queryhouse-editor-keyword-color, #0000ff);
    }

    .queryhouse-syntax-comment {
      color: var(--queryhouse-editor-comment-color, #008000);
    }

    .queryhouse-line-numbers {
      position: fixed;
      z-index: 2147483646;
      pointer-events: none;
      overflow: hidden;
      box-sizing: border-box;
      text-align: right;
      color: var(--queryhouse-line-number-color, #6b7280);
      background: var(--queryhouse-line-number-background, rgba(248, 250, 252, 0.94));
      border-right: 1px solid var(--queryhouse-line-number-border, rgba(148, 163, 184, 0.45));
      user-select: none;
      white-space: pre;
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

  private readonly diagnostics: HTMLDivElement;
  private readonly highlightLayer: HTMLDivElement;
  private readonly lineNumbers: HTMLDivElement;
  private readonly originalPaddingLeft: string;
  private readonly originalPaddingTop: string;
  private readonly basePaddingLeftPx: number;
  private readonly basePaddingTopPx: number;
  private actionRows = new Set<number>();
  private disposers: Array<() => void> = [];
  private lineNumberWidth = 0;

  constructor(element: HTMLTextAreaElement) {
    this.element = element;
    ensureStyles(element.ownerDocument);
    const initialStyle = window.getComputedStyle(element);
    this.originalPaddingLeft = element.style.paddingLeft;
    this.originalPaddingTop = element.style.paddingTop;
    this.basePaddingLeftPx = Number.parseFloat(initialStyle.paddingLeft) || 0;
    this.basePaddingTopPx = Number.parseFloat(initialStyle.paddingTop) || 0;
    this.highlightLayer = element.ownerDocument.createElement('div');
    this.highlightLayer.className = 'queryhouse-highlight-layer';
    this.element.classList.add('queryhouse-syntax-editor');
    this.lineNumbers = element.ownerDocument.createElement('div');
    this.lineNumbers.className = 'queryhouse-line-numbers';
    this.diagnostics = element.ownerDocument.createElement('div');
    this.diagnostics.className = 'queryhouse-diagnostics';
    this.diagnostics.hidden = true;
    element.ownerDocument.body.append(this.lineNumbers);
    element.ownerDocument.body.append(this.highlightLayer);
    element.ownerDocument.body.append(this.diagnostics);
    this.listen(['input', 'scroll'], this.renderEditorOverlays);
    window.addEventListener('resize', this.renderEditorOverlays);
    this.disposers.push(() => window.removeEventListener('resize', this.renderEditorOverlays));
    this.disposers.push(listenForThemeChanges(element.ownerDocument, this.renderEditorOverlays, element));
    this.renderEditorOverlays();
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
    return this.getTextOffsetRect(this.element.selectionStart);
  }

  getTextOffsetRect(offset: number) {
    return this.getTextOffsetRectInternal(offset);
  }

  toggleLineComment() {
    const value = this.element.value;
    const selection = this.getSelection();
    const range = getSelectedLineRange(value, selection);
    const originalBlock = value.slice(range.start, range.end);
    const lines = originalBlock.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const shouldUncomment = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^\s*-- ?/.test(line));
    const updatedLines = lines.map((line) => (shouldUncomment ? line.replace(/^(\s*)-- ?/, '$1') : line.replace(/^(\s*)/, '$1-- ')));
    const updatedBlock = updatedLines.join('\n');
    const nextValue = `${value.slice(0, range.start)}${updatedBlock}${value.slice(range.end)}`;
    const nextSelection = {
      start: mapLineCommentOffset(selection.start, range, lines, updatedLines),
      end: mapLineCommentOffset(selection.end, range, lines, updatedLines)
    };

    this.setValueForHost(nextValue);
    this.element.setSelectionRange(nextSelection.start, nextSelection.end);
    this.renderEditorOverlays();
  }

  runStatement(sql: string) {
    const runButton = findHostRunButton(this.element);
    if (!runButton) {
      return false;
    }

    const originalValue = this.element.value;
    const originalSelection = this.getSelection();
    this.setValueForHost(sql);
    this.element.setSelectionRange(sql.length, sql.length);
    runButton.click();

    window.setTimeout(() => {
      this.setValueForHost(originalValue);
      this.element.setSelectionRange(originalSelection.start, originalSelection.end);
      this.renderEditorOverlays();
    }, 0);

    return true;
  }

  setActionRows(lineIndexes: number[]) {
    this.actionRows = new Set(lineIndexes.filter((lineIndex) => lineIndex >= 0));
    this.renderEditorOverlays();
  }

  setCurrentQueryRange(range: TextRange | null) {
    this.element.classList.toggle('queryhouse-active-editor', range !== null);
    if (range) {
      this.element.dataset.queryhouseCurrentQuery = `${range.start}:${range.end}`;
    } else {
      delete this.element.dataset.queryhouseCurrentQuery;
    }
    this.renderEditorOverlays();
  }

  setDiagnostics(messages: string[]) {
    if (messages.length === 0) {
      this.diagnostics.hidden = true;
      return;
    }

    this.diagnostics.textContent = messages.join('\n');
    this.diagnostics.hidden = false;
    this.diagnostics.style.visibility = 'hidden';
    this.positionFloatingElement(this.diagnostics, this.getAnchorRect(), 6);
    this.diagnostics.style.visibility = '';
  }

  destroy() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.element.classList.remove('queryhouse-active-editor');
    this.element.classList.remove('queryhouse-syntax-editor');
    this.element.style.paddingLeft = this.originalPaddingLeft;
    this.element.style.paddingTop = this.originalPaddingTop;
    this.element.style.removeProperty('--queryhouse-editor-text-color');
    this.lineNumbers.remove();
    this.highlightLayer.remove();
    this.diagnostics.remove();
  }

  private renderEditorOverlays = () => {
    this.renderLineNumbers();
    this.renderSyntax();
  };

  private renderLineNumbers() {
    const lineCount = Math.max(1, this.element.value.split('\n').length);
    const style = window.getComputedStyle(this.element);
    const theme = getEditorTheme(this.element);
    const lineHeightPx = getEditorLineHeightPx(style);
    this.updateEditorPadding(lineCount, lineHeightPx);

    const rect = this.element.getBoundingClientRect();
    const updatedStyle = window.getComputedStyle(this.element);
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const numbers = renderLineNumbers(lineCount, this.actionRows);

    Object.assign(this.lineNumbers.style, {
      left: `${rect.left + borderLeft}px`,
      top: `${rect.top + borderTop}px`,
      width: `${this.lineNumberWidth}px`,
      height: `${Math.max(0, rect.height - borderTop - borderBottom)}px`,
      paddingTop: `${this.basePaddingTopPx}px`,
      paddingRight: '8px',
      font: updatedStyle.font,
      lineHeight: `${lineHeightPx}px`,
      letterSpacing: updatedStyle.letterSpacing
    });
    this.lineNumbers.style.setProperty('--queryhouse-line-number-color', theme.lineNumberColor);
    this.lineNumbers.style.setProperty('--queryhouse-line-number-background', theme.lineNumberBackground);
    this.lineNumbers.style.setProperty('--queryhouse-line-number-border', theme.lineNumberBorder);

    if (this.lineNumbers.textContent !== numbers) {
      this.lineNumbers.textContent = numbers;
    }
    this.lineNumbers.scrollTop = this.element.scrollTop;
  }

  private updateEditorPadding(lineCount: number, lineHeightPx: number) {
    const width = Math.max(36, String(lineCount + 1).length * 8 + 22);
    const paddingTop = `${this.basePaddingTopPx + lineHeightPx}px`;
    if (width === this.lineNumberWidth && this.element.style.paddingTop === paddingTop) {
      return;
    }

    this.lineNumberWidth = width;
    this.element.style.paddingLeft = `${this.basePaddingLeftPx + width}px`;
    this.element.style.paddingTop = paddingTop;
  }

  private renderSyntax = () => {
    const value = this.element.value;
    const rect = this.element.getBoundingClientRect();
    const style = window.getComputedStyle(this.element);
    const theme = getEditorTheme(this.element);
    this.element.style.setProperty('--queryhouse-editor-text-color', theme.textColor);
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
    this.highlightLayer.style.setProperty('--queryhouse-editor-text-color', theme.textColor);
    this.highlightLayer.style.setProperty('--queryhouse-editor-keyword-color', theme.keywordColor);
    this.highlightLayer.style.setProperty('--queryhouse-editor-comment-color', theme.commentColor);

    this.highlightLayer.innerHTML = highlightSqlKeywords(value);
    this.highlightLayer.scrollTop = this.element.scrollTop;
    this.highlightLayer.scrollLeft = this.element.scrollLeft;
    this.highlightLayer.hidden = false;
  };

  private getTextOffsetRectInternal(offset: number) {
    const ownerDocument = this.element.ownerDocument;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const editorRect = this.element.getBoundingClientRect();
    const style = ownerWindow.getComputedStyle(this.element);
    const mirror = ownerDocument.createElement('div');
    const marker = ownerDocument.createElement('span');

    Object.assign(mirror.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      boxSizing: style.boxSizing,
      width: `${editorRect.width}px`,
      minHeight: `${editorRect.height}px`,
      borderTop: style.borderTop,
      borderRight: style.borderRight,
      borderBottom: style.borderBottom,
      borderLeft: style.borderLeft,
      padding: style.padding,
      font: style.font,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlign,
      textTransform: style.textTransform,
      textIndent: style.textIndent,
      whiteSpace: this.element.wrap === 'off' ? 'pre' : 'pre-wrap',
      overflowWrap: this.element.wrap === 'off' ? 'normal' : 'break-word',
      wordBreak: style.wordBreak,
      tabSize: style.tabSize
    });

    mirror.textContent = this.element.value.slice(0, Math.max(0, Math.min(offset, this.element.value.length)));
    marker.textContent = '\u200b';
    mirror.append(marker);
    ownerDocument.body.append(mirror);

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 16;
    const left = editorRect.left + markerRect.left - mirrorRect.left - this.element.scrollLeft;
    const top = editorRect.top + markerRect.top - mirrorRect.top - this.element.scrollTop;
    mirror.remove();

    return new ownerWindow.DOMRect(left, top, 1, Math.max(1, markerRect.height || lineHeight));
  }

  private setValueForHost(value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(this.element, value);
    } else {
      this.element.value = value;
    }
    this.element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: value }));
  }

  private positionFloatingElement(element: HTMLElement, anchor: DOMRect, gap: number) {
    const margin = 8;
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = anchor.left;
    let top = anchor.bottom + gap;

    if (left + rect.width > viewportWidth - margin) {
      left = viewportWidth - margin - rect.width;
    }
    left = Math.max(margin, left);

    if (top + rect.height > viewportHeight - margin) {
      top = anchor.top - rect.height - gap;
    }
    if (top < margin) {
      top = Math.max(margin, Math.min(anchor.bottom + gap, viewportHeight - margin - rect.height));
    }

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  private listen(events: string[], listener: () => void) {
    events.forEach((event) => this.element.addEventListener(event, listener));
    const dispose = () => events.forEach((event) => this.element.removeEventListener(event, listener));
    this.disposers.push(dispose);
    return dispose;
  }
}

function findHostRunButton(element: HTMLElement): HTMLButtonElement | HTMLInputElement | null {
  const scopes = [element.closest('form'), element.ownerDocument.body].filter((scope): scope is HTMLElement => scope !== null);

  for (const scope of scopes) {
    const candidates = Array.from(scope.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="button"], input[type="submit"]'))
      .filter((candidate) => !candidate.disabled && !candidate.classList.contains('queryhouse-run-statement'));
    const runButton = candidates
      .map((candidate) => ({ candidate, score: scoreRunCandidate(candidate) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.candidate;

    if (runButton) {
      return runButton;
    }
  }

  return null;
}

function scoreRunCandidate(candidate: HTMLButtonElement | HTMLInputElement) {
  const haystack = [
    candidate.textContent,
    candidate.getAttribute('aria-label'),
    candidate.getAttribute('title'),
    candidate.value,
    candidate.id,
    candidate.className
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  if (/\brun\b|\bexecute\b|\bquery\b/.test(haystack)) score += 5;
  if (candidate.type === 'submit') score += 1;
  if (candidate.getAttribute('aria-label')) score += 1;
  return score;
}

function getSelectedLineRange(value: string, selection: TextRange): TextRange {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const endForLine = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = value.indexOf('\n', endForLine);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  return { start: lineStart, end: lineEnd };
}

function mapLineCommentOffset(offset: number, range: TextRange, originalLines: string[], updatedLines: string[]) {
  if (offset <= range.start) {
    return offset;
  }

  const totalDelta = updatedLines.join('\n').length - originalLines.join('\n').length;
  if (offset >= range.end) {
    return offset + totalDelta;
  }

  let originalLineStart = range.start;
  let updatedLineStart = range.start;
  for (let index = 0; index < originalLines.length; index += 1) {
    const originalLine = originalLines[index] ?? '';
    const updatedLine = updatedLines[index] ?? '';
    const originalLineEnd = originalLineStart + originalLine.length;
    if (offset <= originalLineEnd) {
      const column = offset - originalLineStart;
      const editColumn = getLineCommentEditColumn(originalLine, updatedLine);
      const lineDelta = updatedLine.length - originalLine.length;
      if (lineDelta < 0 && column > editColumn && column <= editColumn - lineDelta) {
        return updatedLineStart + editColumn;
      }
      return updatedLineStart + column + (column >= editColumn ? lineDelta : 0);
    }

    originalLineStart = originalLineEnd + 1;
    updatedLineStart += updatedLine.length + 1;
  }

  return range.start + totalDelta;
}

function getLineCommentEditColumn(originalLine: string, updatedLine: string) {
  let column = 0;
  while (column < originalLine.length && column < updatedLine.length && originalLine[column] === updatedLine[column]) {
    column += 1;
  }
  return column;
}

function getEditorLineHeightPx(style: CSSStyleDeclaration) {
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }

  const fontSize = Number.parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  }

  return 16 * DEFAULT_LINE_HEIGHT_MULTIPLIER;
}

function getEditorTheme(element: HTMLTextAreaElement) {
  const hadSyntaxClass = element.classList.contains('queryhouse-syntax-editor');
  if (hadSyntaxClass) {
    element.classList.remove('queryhouse-syntax-editor');
  }

  const visibleStyle = window.getComputedStyle(element);
  const visibleTextColor = isTransparentColor(visibleStyle.color) ? '#111827' : visibleStyle.color;
  const usesDarkByColor = getUsesDarkSurface(visibleTextColor, visibleStyle.backgroundColor);
  const usesDarkEditor = usesDarkByColor ?? (getDocumentColorMode(element.ownerDocument) === 'dark');

  if (hadSyntaxClass) {
    element.classList.add('queryhouse-syntax-editor');
  }

  return {
    textColor: usesDarkEditor ? '#f8fafc' : visibleTextColor,
    keywordColor: usesDarkEditor ? '#facc15' : '#0000ff',
    commentColor: usesDarkEditor ? '#4ade80' : '#008000',
    lineNumberColor: usesDarkEditor ? '#94a3b8' : '#6b7280',
    lineNumberBackground: usesDarkEditor ? 'rgba(15, 23, 42, 0.94)' : 'rgba(248, 250, 252, 0.94)',
    lineNumberBorder: usesDarkEditor ? 'rgba(51, 65, 85, 0.78)' : 'rgba(148, 163, 184, 0.45)'
  };
}

function renderLineNumbers(lineCount: number, actionRows: Set<number>) {
  const lines = [''];
  let visibleLineNumber = 1;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    if (actionRows.has(lineIndex)) {
      lines.push('');
      continue;
    }

    lines.push(String(visibleLineNumber));
    visibleLineNumber += 1;
  }

  return lines.join('\n');
}

function highlightSqlKeywords(value: string) {
  let html = '';
  let index = 0;

  while (index < value.length) {
    const char = value[index];
    const next = value[index + 1];

    if (char === '-' && next === '-') {
      const end = value.indexOf('\n', index + 2);
      const stop = end === -1 ? value.length : end;
      html += renderCommentToken(value.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = value.indexOf('*/', index + 2);
      const stop = end === -1 ? value.length : end + 2;
      html += renderCommentToken(value.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      const stop = findQuotedTokenEnd(value, index, char);
      html += escapeHtml(value.slice(index, stop));
      index = stop;
      continue;
    }

    if (char && /[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < value.length && /[A-Za-z0-9_]/.test(value[end] ?? '')) {
        end += 1;
      }
      const word = value.slice(index, end);
      html += SQL_KEYWORDS.has(word.toUpperCase()) ? `<span class="queryhouse-syntax-keyword">${escapeHtml(word)}</span>` : escapeHtml(word);
      index = end;
      continue;
    }

    html += escapeHtml(char ?? '');
    index += 1;
  }

  return html;
}

function renderCommentToken(value: string) {
  return `<span class="queryhouse-syntax-comment">${escapeHtml(value)}</span>`;
}

function findQuotedTokenEnd(value: string, start: number, quote: string) {
  for (let index = start + 1; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === quote) {
      if ((quote === "'" || quote === '"') && next === quote) {
        index += 1;
        continue;
      }
      return index + 1;
    }
  }

  return value.length;
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
