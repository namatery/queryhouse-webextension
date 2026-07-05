import { TextareaAdapter } from './textarea-adapter';
import type { EditorAdapter } from './types';

const LOCAL_PLAY_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isLocalClickHousePlayUrl(location: Pick<Location, 'hostname' | 'pathname'>) {
  if (!LOCAL_PLAY_HOSTS.has(location.hostname)) {
    return false;
  }

  const path = location.pathname.toLowerCase();
  return path === '/' || path.includes('play') || path.includes('query') || path.includes('sql');
}

export function detectSqlEditor(ownerDocument: Document): EditorAdapter | null {
  if (!isLocalClickHousePlayUrl(ownerDocument.location)) {
    return null;
  }

  const textareas = Array.from(ownerDocument.querySelectorAll('textarea'));
  const candidate = textareas
    .filter((textarea) => !textarea.disabled && !textarea.readOnly)
    .map((textarea) => ({ textarea, score: scoreTextarea(textarea) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return candidate ? new TextareaAdapter(candidate.textarea) : null;
}

function scoreTextarea(textarea: HTMLTextAreaElement) {
  const haystack = [
    textarea.id,
    textarea.name,
    textarea.className,
    textarea.placeholder,
    textarea.getAttribute('aria-label'),
    textarea.closest('form')?.textContent,
    textarea.value
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  if (/\bsql\b|query|clickhouse|select|insert|table/.test(haystack)) {
    score += 5;
  }
  if (textarea.rows >= 4) {
    score += 2;
  }
  if (textarea.clientWidth >= 360 || textarea.offsetWidth >= 360) {
    score += 1;
  }
  if (/select\s+.+\s+from|show\s+tables|describe\s+table/i.test(textarea.value)) {
    score += 4;
  }
  return score;
}
