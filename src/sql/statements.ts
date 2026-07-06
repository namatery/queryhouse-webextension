import type { TextRange } from '../editor/types';

export type SqlStatement = TextRange & {
  text: string;
};

type ScannerState = 'normal' | 'single-quote' | 'double-quote' | 'backtick' | 'line-comment' | 'block-comment';

export function splitSqlStatements(sql: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let start = 0;
  let state: ScannerState = 'normal';

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') state = 'normal';
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'normal';
        index += 1;
      }
      continue;
    }

    if (state === 'single-quote') {
      if (char === '\\') {
        index += 1;
      } else if (char === "'" && next === "'") {
        index += 1;
      } else if (char === "'") {
        state = 'normal';
      }
      continue;
    }

    if (state === 'double-quote') {
      if (char === '\\') {
        index += 1;
      } else if (char === '"' && next === '"') {
        index += 1;
      } else if (char === '"') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'backtick') {
      if (char === '`') state = 'normal';
      continue;
    }

    if (char === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (char === "'") {
      state = 'single-quote';
      continue;
    }
    if (char === '"') {
      state = 'double-quote';
      continue;
    }
    if (char === '`') {
      state = 'backtick';
      continue;
    }
    if (char === ';') {
      pushStatement(statements, sql, start, index);
      start = index + 1;
    }
  }

  pushStatement(statements, sql, start, sql.length);
  return statements;
}

export function findCurrentStatement(sql: string, cursor: number): SqlStatement | null {
  const statements = splitSqlStatements(sql);
  if (statements.length === 0) {
    return null;
  }

  return (
    statements.find((statement) => cursor >= statement.start && cursor <= statement.end) ??
    statements.find((statement) => cursor < statement.start) ??
    statements[statements.length - 1] ??
    null
  );
}

export function getExecutableStatementText(sql: string, statement: TextRange): string | null {
  const terminator = findStatementTerminator(sql, statement);
  if (terminator === -1) {
    return null;
  }

  return sql.slice(statement.start, terminator + 1).trim();
}

function findStatementTerminator(sql: string, statement: TextRange) {
  for (let index = statement.end; index < sql.length; index += 1) {
    const char = sql[index];
    if (char === ';') {
      return index;
    }
    if (!/\s/.test(char ?? '')) {
      return -1;
    }
  }

  return -1;
}

function pushStatement(statements: SqlStatement[], sql: string, rawStart: number, rawEnd: number) {
  const text = sql.slice(rawStart, rawEnd);
  const leading = text.search(/\S/);
  if (leading === -1) {
    return;
  }

  const trailingMatch = /\s*$/.exec(text);
  const trailing = trailingMatch ? trailingMatch[0].length : 0;
  const start = rawStart + leading;
  const end = rawEnd - trailing;
  statements.push({
    start,
    end,
    text: sql.slice(start, end)
  });
}
