import type { TextRange } from '../editor/types';

export type CompletionKind = 'keyword' | 'function' | 'type' | 'engine' | 'setting';

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

const CLICKHOUSE_SELECT_KEYWORDS: CompletionItem[] = [
  { label: 'SELECT', insertText: 'SELECT', kind: 'keyword', detail: 'Start a SELECT query.' },
  { label: 'WITH', insertText: 'WITH', kind: 'keyword', detail: 'Define CTEs or reusable expressions before SELECT.' },
  { label: 'DISTINCT', insertText: 'DISTINCT', kind: 'keyword', detail: 'Return distinct rows.' },
  { label: 'ON', insertText: 'ON', kind: 'keyword', detail: 'Join or DISTINCT ON condition.' },
  { label: 'FROM', insertText: 'FROM', kind: 'keyword', detail: 'Read from a table, subquery, or table function.' },
  { label: 'FINAL', insertText: 'FINAL', kind: 'keyword', detail: 'Merge table data before returning rows; place after table alias.' },
  { label: 'SAMPLE', insertText: 'SAMPLE', kind: 'keyword', detail: 'Read an approximate sample from supported tables.' },
  { label: 'ARRAY JOIN', insertText: 'ARRAY JOIN', kind: 'keyword', detail: 'Expand arrays into rows.' },
  { label: 'JOIN', insertText: 'JOIN', kind: 'keyword', detail: 'Join another table expression.' },
  { label: 'INNER JOIN', insertText: 'INNER JOIN', kind: 'keyword', detail: 'Return matching rows from both sides.' },
  { label: 'LEFT JOIN', insertText: 'LEFT JOIN', kind: 'keyword', detail: 'Return all left-side rows and matching right-side rows.' },
  { label: 'RIGHT JOIN', insertText: 'RIGHT JOIN', kind: 'keyword', detail: 'Return all right-side rows and matching left-side rows.' },
  { label: 'FULL JOIN', insertText: 'FULL JOIN', kind: 'keyword', detail: 'Return rows from either side.' },
  { label: 'CROSS JOIN', insertText: 'CROSS JOIN', kind: 'keyword', detail: 'Return the Cartesian product.' },
  { label: 'GLOBAL JOIN', insertText: 'GLOBAL JOIN', kind: 'keyword', detail: 'Broadcast the right table for distributed JOINs.' },
  { label: 'ANY JOIN', insertText: 'ANY JOIN', kind: 'keyword', detail: 'Join with ANY strictness.' },
  { label: 'ALL JOIN', insertText: 'ALL JOIN', kind: 'keyword', detail: 'Join with ALL strictness.' },
  { label: 'ASOF JOIN', insertText: 'ASOF JOIN', kind: 'keyword', detail: 'Join nearest matching rows by ordered value.' },
  { label: 'SEMI JOIN', insertText: 'SEMI JOIN', kind: 'keyword', detail: 'Filter by join existence.' },
  { label: 'ANTI JOIN', insertText: 'ANTI JOIN', kind: 'keyword', detail: 'Filter by join non-existence.' },
  { label: 'USING', insertText: 'USING', kind: 'keyword', detail: 'Join using common column names.' },
  { label: 'PREWHERE', insertText: 'PREWHERE', kind: 'keyword', detail: 'Apply early filtering before WHERE.' },
  { label: 'WHERE', insertText: 'WHERE', kind: 'keyword', detail: 'Filter rows.' },
  { label: 'GROUP BY', insertText: 'GROUP BY', kind: 'keyword', detail: 'Aggregate rows by expressions.' },
  { label: 'WITH ROLLUP', insertText: 'WITH ROLLUP', kind: 'keyword', detail: 'Add grouped subtotal rows.' },
  { label: 'WITH CUBE', insertText: 'WITH CUBE', kind: 'keyword', detail: 'Add subtotal rows for grouping dimensions.' },
  { label: 'WITH TOTALS', insertText: 'WITH TOTALS', kind: 'keyword', detail: 'Return totals for aggregate queries.' },
  { label: 'HAVING', insertText: 'HAVING', kind: 'keyword', detail: 'Filter aggregate rows.' },
  { label: 'WINDOW', insertText: 'WINDOW', kind: 'keyword', detail: 'Define named window expressions.' },
  { label: 'QUALIFY', insertText: 'QUALIFY', kind: 'keyword', detail: 'Filter after window function evaluation.' },
  { label: 'ORDER BY', insertText: 'ORDER BY', kind: 'keyword', detail: 'Sort result rows.' },
  { label: 'WITH FILL', insertText: 'WITH FILL', kind: 'keyword', detail: 'Fill missing ORDER BY values.' },
  { label: 'INTERPOLATE', insertText: 'INTERPOLATE', kind: 'keyword', detail: 'Interpolate values for WITH FILL.' },
  { label: 'LIMIT BY', insertText: 'LIMIT BY', kind: 'keyword', detail: 'Limit rows per distinct key.' },
  { label: 'LIMIT', insertText: 'LIMIT', kind: 'keyword', detail: 'Limit returned rows.' },
  { label: 'OFFSET', insertText: 'OFFSET', kind: 'keyword', detail: 'Skip rows before returning results.' },
  { label: 'WITH TIES', insertText: 'WITH TIES', kind: 'keyword', detail: 'Include rows tied at the LIMIT boundary.' },
  { label: 'SETTINGS', insertText: 'SETTINGS', kind: 'keyword', detail: 'Set query-level ClickHouse settings.' },
  { label: 'UNION', insertText: 'UNION', kind: 'keyword', detail: 'Combine query results.' },
  { label: 'INTERSECT', insertText: 'INTERSECT', kind: 'keyword', detail: 'Return rows common to both queries.' },
  { label: 'EXCEPT', insertText: 'EXCEPT', kind: 'keyword', detail: 'Set operator or SELECT * column modifier.' },
  { label: 'INTO OUTFILE', insertText: 'INTO OUTFILE', kind: 'keyword', detail: 'Write query output to a file.' },
  { label: 'FORMAT', insertText: 'FORMAT', kind: 'keyword', detail: 'Choose the output format.' },
  { label: 'COLUMNS', insertText: 'COLUMNS()', kind: 'keyword', detail: 'Select columns by regular expression.' },
  { label: 'APPLY', insertText: 'APPLY()', kind: 'keyword', detail: 'Apply a function to selected columns.' },
  { label: 'REPLACE', insertText: 'REPLACE()', kind: 'keyword', detail: 'Replace SELECT * columns by expression.' },
  { label: 'LIKE', insertText: 'LIKE', kind: 'keyword', detail: 'Pattern match expression or SELECT * columns.' },
  { label: 'ILIKE', insertText: 'ILIKE', kind: 'keyword', detail: 'Case-insensitive pattern match.' },
  { label: 'AS', insertText: 'AS', kind: 'keyword', detail: 'Define an alias.' },
  { label: 'AND', insertText: 'AND', kind: 'keyword', detail: 'Logical conjunction.' },
  { label: 'OR', insertText: 'OR', kind: 'keyword', detail: 'Logical disjunction.' },
  { label: 'NOT', insertText: 'NOT', kind: 'keyword', detail: 'Logical negation.' },
  { label: 'IN', insertText: 'IN', kind: 'keyword', detail: 'Check membership.' },
  { label: 'BETWEEN', insertText: 'BETWEEN', kind: 'keyword', detail: 'Check inclusive range.' },
  { label: 'IS NULL', insertText: 'IS NULL', kind: 'keyword', detail: 'Check for NULL.' },
  { label: 'IS NOT NULL', insertText: 'IS NOT NULL', kind: 'keyword', detail: 'Check for non-NULL.' }
];

const CLICKHOUSE_STATEMENT_KEYWORDS: CompletionItem[] = [
  'ALTER TABLE',
  'ATTACH',
  'CHECK TABLE',
  'CREATE DATABASE',
  'CREATE TABLE',
  'DELETE',
  'DESCRIBE TABLE',
  'DETACH',
  'DROP TABLE',
  'EXCHANGE',
  'EXISTS',
  'EXPLAIN',
  'GRANT',
  'INSERT INTO',
  'KILL',
  'MOVE',
  'OPTIMIZE',
  'PARALLEL WITH',
  'RENAME',
  'REVOKE',
  'SET',
  'SET ROLE',
  'SHOW TABLES',
  'SYSTEM',
  'TRUNCATE',
  'UNDROP',
  'UPDATE',
  'USE',
  'WATCH'
].map((label) => ({
  label,
  insertText: label,
  kind: 'keyword' as const,
  detail: 'ClickHouse statement keyword.'
}));

const COMPLETIONS: CompletionItem[] = [
  ...CLICKHOUSE_SELECT_KEYWORDS,
  ...CLICKHOUSE_STATEMENT_KEYWORDS,
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
  })),
  ...['final', 'max_final_threads', 'optimize_read_in_order', 'cast_keep_nullable', 'max_memory_usage', 'max_threads', 'max_rows_to_read', 'max_result_rows', 'max_execution_time', 'allow_experimental_analyzer'].map((label) => ({
    label,
    insertText: label,
    kind: 'setting' as const
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
