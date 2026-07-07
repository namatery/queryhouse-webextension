import { describe, expect, it } from 'vitest';
import { detectSqlEditor, isInjectablePageUrl } from './detect';

describe('isInjectablePageUrl', () => {
  it('accepts http pages', () => {
    expect(isInjectablePageUrl({ protocol: 'http:' } as Location)).toBe(true);
  });

  it('accepts https pages', () => {
    expect(isInjectablePageUrl({ protocol: 'https:' } as Location)).toBe(true);
  });

  it('rejects extension pages', () => {
    expect(isInjectablePageUrl({ protocol: 'chrome-extension:' } as Location)).toBe(false);
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
