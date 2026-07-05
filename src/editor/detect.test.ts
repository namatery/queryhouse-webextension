import { describe, expect, it } from 'vitest';
import { detectSqlEditor, isLocalClickHousePlayUrl } from './detect';

describe('isLocalClickHousePlayUrl', () => {
  it('accepts local ClickHouse Play-like URLs', () => {
    expect(isLocalClickHousePlayUrl({ hostname: 'localhost', pathname: '/play' } as Location)).toBe(true);
  });

  it('rejects non-local hosts', () => {
    expect(isLocalClickHousePlayUrl({ hostname: 'example.com', pathname: '/play' } as Location)).toBe(false);
  });
});

describe('detectSqlEditor', () => {
  it('creates a textarea adapter for SQL-like textareas', () => {
    document.body.innerHTML = '<textarea placeholder="SQL query" rows="8"></textarea>';

    const adapter = detectSqlEditor(document);

    expect(adapter?.element.tagName).toBe('TEXTAREA');
    adapter?.destroy();
  });

  it('returns null when no supported editor exists', () => {
    document.body.innerHTML = '<input />';

    expect(detectSqlEditor(document)).toBeNull();
  });
});
