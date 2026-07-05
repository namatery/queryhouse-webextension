import type { TextRange } from '../editor/types';

export type CompletionKind = 'keyword' | 'function' | 'type' | 'engine';

export type CompletionItem = {
  label: string;
  kind: CompletionKind;
  insertText: string;
  detail?: string;
};

export type CompletionResult = {
  range: TextRange;
  items: CompletionItem[];
};

const COMPLETIONS: CompletionItem[] = [
  ...['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'WITH', 'INSERT INTO', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'DESCRIBE TABLE', 'SHOW TABLES', 'FORMAT', 'SETTINGS', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL'].map((label) => ({
    label,
    insertText: label,
    kind: 'keyword' as const
  })),
  ...['UInt8', 'UInt16', 'UInt32', 'UInt64', 'Int8', 'Int16', 'Int32', 'Int64', 'Float32', 'Float64', 'Decimal', 'String', 'FixedString', 'Date', 'DateTime', 'DateTime64', 'Array', 'Tuple', 'Nullable', 'LowCardinality', 'Map', 'UUID', 'IPv4', 'IPv6', 'JSON'].map((label) => ({
    label,
    insertText: label,
    kind: 'type' as const
  })),
  ...['MergeTree', 'ReplacingMergeTree', 'SummingMergeTree', 'AggregatingMergeTree', 'CollapsingMergeTree', 'VersionedCollapsingMergeTree', 'Distributed', 'Memory', 'Log', 'TinyLog', 'StripeLog', 'Null', 'View', 'MaterializedView'].map((label) => ({
    label,
    insertText: label,
    kind: 'engine' as const
  })),
  ...['count', 'sum', 'avg', 'min', 'max', 'uniq', 'uniqExact', 'toDate', 'toDateTime', 'formatDateTime', 'now', 'today', 'yesterday', 'if', 'multiIf', 'coalesce', 'length', 'substring', 'replaceRegexpAll', 'lower', 'upper', 'JSONExtractString', 'JSONExtractInt', 'arrayJoin', 'has', 'dictGet'].map((label) => ({
    label,
    insertText: `${label}()`,
    kind: 'function' as const
  }))
];

export function getCompletions(sql: string, cursor: number): CompletionResult | null {
  const range = findReplacementRange(sql, cursor);
  const prefix = sql.slice(range.start, range.end);
  if (prefix.length === 0) {
    return null;
  }

  const normalized = prefix.toLowerCase();
  const items = COMPLETIONS.filter((item) => item.label.toLowerCase().startsWith(normalized))
    .sort((a, b) => rankCompletion(a, normalized) - rankCompletion(b, normalized) || a.label.localeCompare(b.label))
    .slice(0, 12);

  return items.length > 0 ? { range, items } : null;
}

function findReplacementRange(sql: string, cursor: number): TextRange {
  let start = cursor;
  while (start > 0 && /[a-zA-Z0-9_]/.test(sql[start - 1] ?? '')) {
    start -= 1;
  }
  return { start, end: cursor };
}

function rankCompletion(item: CompletionItem, prefix: string) {
  const label = item.label.toLowerCase();
  if (label === prefix) return 0;
  if (item.kind === 'keyword') return 1;
  if (item.kind === 'function') return 2;
  return 3;
}
