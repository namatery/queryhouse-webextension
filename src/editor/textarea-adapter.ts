import type { EditorAdapter, TextRange } from './types';
import { getDocumentColorMode, getUsesDarkSurface, isTransparentColor, listenForThemeChanges } from '../theme';

const STYLE_ID = 'queryhouse-editor-style';
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;
const BLANK_LINE_PLACEHOLDER = '\u200b';
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
      overflow-wrap: break-word;
      border: 1px solid transparent;
    }

    .queryhouse-syntax-keyword {
      color: var(--queryhouse-editor-keyword-color, #0000ff);
    }

    .queryhouse-syntax-comment {
      color: var(--queryhouse-editor-comment-color, #008000);
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
  private disposers: Array<() => void> = [];

  constructor(element: HTMLTextAreaElement) {
    this.element = element;
    ensureStyles(element.ownerDocument);
    this.highlightLayer = element.ownerDocument.createElement('div');
    this.highlightLayer.className = 'queryhouse-highlight-layer';
    this.element.classList.add('queryhouse-syntax-editor');
    this.diagnostics = element.ownerDocument.createElement('div');
    this.diagnostics.className = 'queryhouse-diagnostics';
    this.diagnostics.hidden = true;
    element.ownerDocument.body.append(this.highlightLayer);
    element.ownerDocument.body.append(this.diagnostics);
    this.listen(['input', 'scroll', 'select', 'keyup', 'mouseup', 'focus'], this.renderEditorOverlays);
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
    this.element.style.removeProperty('--queryhouse-editor-text-color');
    this.highlightLayer.remove();
    this.diagnostics.remove();
  }

  private renderEditorOverlays = () => {
    this.renderSyntax();
  };

  private renderSyntax = () => {
    const hasSelection = this.element.selectionStart !== this.element.selectionEnd;
    this.element.classList.toggle('queryhouse-syntax-editor', !hasSelection);
    this.highlightLayer.hidden = hasSelection;
    if (hasSelection) {
      return;
    }

    const value = this.element.value;
    const rect = this.element.getBoundingClientRect();
    const style = window.getComputedStyle(this.element);
    const metrics = getEditorTextMetrics(style, this.element.wrap);
    const theme = getEditorTheme(this.element);
    this.element.style.setProperty('--queryhouse-editor-text-color', theme.textColor);
    Object.assign(this.highlightLayer.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      padding: style.padding,
      borderTop: getTransparentBorder(style.borderTopWidth, style.borderTopStyle),
      borderRight: getTransparentBorder(style.borderRightWidth, style.borderRightStyle),
      borderBottom: getTransparentBorder(style.borderBottomWidth, style.borderBottomStyle),
      borderLeft: getTransparentBorder(style.borderLeftWidth, style.borderLeftStyle),
      font: metrics.font,
      fontFamily: metrics.fontFamily,
      fontSize: metrics.fontSize,
      fontStretch: metrics.fontStretch,
      fontStyle: metrics.fontStyle,
      fontVariant: metrics.fontVariant,
      fontWeight: metrics.fontWeight,
      lineHeight: metrics.lineHeight,
      letterSpacing: metrics.letterSpacing,
      textAlign: metrics.textAlign,
      textTransform: metrics.textTransform,
      textIndent: metrics.textIndent,
      direction: metrics.direction,
      unicodeBidi: metrics.unicodeBidi,
      wordBreak: metrics.wordBreak,
      borderRadius: style.borderRadius
    });
    applyTextFlowStyles(this.highlightLayer, metrics);
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
    const metrics = getEditorTextMetrics(style, this.element.wrap);
    const mirror = ownerDocument.createElement('div');
    const marker = ownerDocument.createElement('span');

    Object.assign(mirror.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      boxSizing: 'border-box',
      width: `${editorRect.width}px`,
      minHeight: `${editorRect.height}px`,
      borderTop: getTransparentBorder(style.borderTopWidth, style.borderTopStyle),
      borderRight: getTransparentBorder(style.borderRightWidth, style.borderRightStyle),
      borderBottom: getTransparentBorder(style.borderBottomWidth, style.borderBottomStyle),
      borderLeft: getTransparentBorder(style.borderLeftWidth, style.borderLeftStyle),
      padding: style.padding,
      font: metrics.font,
      fontFamily: metrics.fontFamily,
      fontSize: metrics.fontSize,
      fontStretch: metrics.fontStretch,
      fontStyle: metrics.fontStyle,
      fontVariant: metrics.fontVariant,
      fontWeight: metrics.fontWeight,
      lineHeight: metrics.lineHeight,
      letterSpacing: metrics.letterSpacing,
      textAlign: metrics.textAlign,
      textTransform: metrics.textTransform,
      textIndent: metrics.textIndent,
      direction: metrics.direction,
      unicodeBidi: metrics.unicodeBidi,
      whiteSpace: metrics.whiteSpace,
      overflowWrap: metrics.overflowWrap,
      wordWrap: metrics.overflowWrap,
      wordBreak: metrics.wordBreak,
      tabSize: metrics.tabSize
    });

    applyTextFlowStyles(mirror, metrics);
    mirror.textContent = this.element.value.slice(0, Math.max(0, Math.min(offset, this.element.value.length)));
    marker.textContent = '\u200b';
    mirror.append(marker);
    ownerDocument.body.append(mirror);

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const left = editorRect.left + markerRect.left - mirrorRect.left - this.element.scrollLeft;
    const top = editorRect.top + markerRect.top - mirrorRect.top - this.element.scrollTop;
    mirror.remove();

    return new ownerWindow.DOMRect(left, top, 1, Math.max(1, markerRect.height || metrics.lineHeightPx));
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

function getEditorTextMetrics(style: CSSStyleDeclaration, wrap: string) {
  const lineHeightPx = getEditorLineHeightPx(style);
  const wrapsText = wrap !== 'off';
  const lineHeight = style.lineHeight || `${lineHeightPx}px`;

  return {
    font: style.font,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontStretch: style.fontStretch,
    fontStyle: style.fontStyle,
    fontVariant: style.fontVariant,
    fontWeight: style.fontWeight,
    lineHeight,
    lineHeightPx,
    letterSpacing: style.letterSpacing,
    tabSize: style.tabSize,
    textAlign: style.textAlign,
    textTransform: style.textTransform,
    textIndent: style.textIndent,
    direction: style.direction,
    unicodeBidi: style.unicodeBidi,
    wordBreak: style.wordBreak,
    whiteSpace: wrapsText ? 'pre-wrap' : 'pre',
    overflowWrap: wrapsText ? 'break-word' : 'normal',
    fontKerning: style.getPropertyValue('font-kerning'),
    fontFeatureSettings: style.getPropertyValue('font-feature-settings'),
    fontVariationSettings: style.getPropertyValue('font-variation-settings'),
    fontVariantLigatures: style.getPropertyValue('font-variant-ligatures'),
    textRendering: style.getPropertyValue('text-rendering')
  };
}

function applyTextFlowStyles(element: HTMLElement, metrics: ReturnType<typeof getEditorTextMetrics>) {
  element.style.whiteSpace = metrics.whiteSpace;
  element.style.overflowWrap = metrics.overflowWrap;
  element.style.wordWrap = metrics.overflowWrap;
  element.style.tabSize = metrics.tabSize;
  setStylePropertyIfPresent(element, 'font-kerning', metrics.fontKerning);
  setStylePropertyIfPresent(element, 'font-feature-settings', metrics.fontFeatureSettings);
  setStylePropertyIfPresent(element, 'font-variation-settings', metrics.fontVariationSettings);
  setStylePropertyIfPresent(element, 'font-variant-ligatures', metrics.fontVariantLigatures);
  setStylePropertyIfPresent(element, 'text-rendering', metrics.textRendering);
}

function getTransparentBorder(width: string, style: string) {
  const borderStyle = style && style !== 'none' ? style : 'solid';
  return `${width || '0px'} ${borderStyle} transparent`;
}

function setStylePropertyIfPresent(element: HTMLElement, property: string, value: string) {
  if (value) {
    element.style.setProperty(property, value);
  }
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
    commentColor: usesDarkEditor ? '#4ade80' : '#008000'
  };
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

  return preserveBlankHighlightLines(html);
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

function preserveBlankHighlightLines(html: string) {
  return html.replace(/(^|\n)(?=\n|$)/g, `$1${BLANK_LINE_PLACEHOLDER}`);
}
