import type { TextRange } from '../editor/types';

export type DiagnosticSeverity = 'warning' | 'error';

export type Diagnostic = {
  severity: DiagnosticSeverity;
  message: string;
  range?: TextRange;
  source: 'local' | 'parser';
};

export function runLocalDiagnostics(sql: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (sql.trim().length === 0) {
    return diagnostics;
  }

  const quote = findUnclosedQuote(sql);
  if (quote) {
    diagnostics.push({
      severity: 'error',
      message: `Unclosed ${quote.kind}.`,
      range: { start: quote.index, end: quote.index + 1 },
      source: 'local'
    });
  }

  const bracket = findUnmatchedBracket(sql);
  if (bracket) {
    diagnostics.push({
      severity: 'error',
      message: `Unmatched "${bracket.char}".`,
      range: { start: bracket.index, end: bracket.index + 1 },
      source: 'local'
    });
  }

  if (/,\s*(from|prewhere|where|group\s+by|having|qualify|order\s+by|limit|settings|format|;|$)/i.test(sql)) {
    diagnostics.push({
      severity: 'warning',
      message: 'Possible dangling comma before a clause or statement end.',
      source: 'local'
    });
  }

  if (/\b(from|join)\s+[\w.`"]+\s+final\s+as\s+[\w`"]+/i.test(sql)) {
    diagnostics.push({
      severity: 'error',
      message: 'ClickHouse FINAL must come after the table alias, for example: FROM table AS t FINAL.',
      source: 'local'
    });
  }

  if (/;[ \t\r\n]*;/.test(sql)) {
    diagnostics.push({
      severity: 'warning',
      message: 'Duplicated semicolon creates an empty statement.',
      source: 'local'
    });
  }

  if (!/[;]\s*$/.test(sql.trim())) {
    diagnostics.push({
      severity: 'warning',
      message: 'Statement is missing a trailing semicolon.',
      source: 'local'
    });
  }

  return diagnostics;
}

function findUnclosedQuote(sql: string): { kind: string; index: number } | null {
  let quote: "'" | '"' | '`' | null = null;
  let quoteIndex = -1;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (!quote && char === '-' && next === '-') {
      const newline = sql.indexOf('\n', index + 2);
      if (newline === -1) break;
      index = newline;
      continue;
    }

    if (!quote && char === '/' && next === '*') {
      const close = sql.indexOf('*/', index + 2);
      if (close === -1) {
        return { kind: 'block comment', index };
      }
      index = close + 1;
      continue;
    }

    if (!quote && (char === "'" || char === '"' || char === '`')) {
      quote = char;
      quoteIndex = index;
      continue;
    }

    if (quote && char === '\\') {
      index += 1;
      continue;
    }

    if (quote && char === quote) {
      if ((quote === "'" || quote === '"') && next === quote) {
        index += 1;
      } else {
        quote = null;
        quoteIndex = -1;
      }
    }
  }

  if (!quote) {
    return null;
  }

  const kind = quote === '`' ? 'backtick identifier' : `${quote} string`;
  return { kind, index: quoteIndex };
}

function findUnmatchedBracket(sql: string): { char: string; index: number } | null {
  const stack: Array<{ char: string; index: number }> = [];
  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{'
  };
  let quote: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        if ((quote === "'" || quote === '"') && next === quote) {
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', index + 2);
      if (newline === -1) break;
      index = newline;
      continue;
    }
    if (char === '/' && next === '*') {
      const close = sql.indexOf('*/', index + 2);
      if (close === -1) break;
      index = close + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      stack.push({ char, index });
      continue;
    }
    if (char && char in pairs) {
      const expected = pairs[char];
      const last = stack.pop();
      if (!last || last.char !== expected) {
        return { char, index };
      }
    }
  }

  const open = stack.pop();
  return open ? { char: open.char, index: open.index } : null;
}
