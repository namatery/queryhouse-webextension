import type { Diagnostic } from './diagnostics';

type ParserModule = Record<string, unknown>;

export async function runParserValidation(sql: string): Promise<Diagnostic[]> {
  if (sql.trim().length === 0) {
    return [];
  }

  try {
    const parser = (await import('@clickhouse/parser')) as ParserModule;
    const parse = findParseFunction(parser);
    if (!parse) {
      return [];
    }

    parse(sql);
    return [];
  } catch (error) {
    const range = getParserErrorRange(error);
    return [
      {
        severity: 'error',
        message: normalizeParserError(error),
        ...(range ? { range } : {}),
        source: 'parser'
      }
    ];
  }
}

function findParseFunction(parser: ParserModule): ((sql: string) => unknown) | null {
  for (const key of ['parse', 'parseQuery', 'parseClickHouseQuery', 'default']) {
    const candidate = parser[key];
    if (typeof candidate === 'function') {
      return candidate as (sql: string) => unknown;
    }
  }
  return null;
}

function normalizeParserError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `Parser: ${error.message}`;
  }
  return 'Parser validation failed.';
}

function getParserErrorRange(error: unknown) {
  if (!error || typeof error !== 'object' || !('location' in error)) {
    return null;
  }

  const location = (error as { location?: { start?: { offset?: unknown }; end?: { offset?: unknown } } }).location;
  const start = location?.start?.offset;
  const end = location?.end?.offset;
  if (typeof start !== 'number' || typeof end !== 'number') {
    return null;
  }

  return { start, end };
}
