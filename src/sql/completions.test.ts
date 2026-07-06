import { describe, expect, it } from 'vitest';
import { getCompletions } from './completions';

describe('getCompletions', () => {
  it('returns prefix matches with replacement range', () => {
    const result = getCompletions('SEL', 3);

    expect(result?.range).toEqual({ start: 0, end: 3 });
    expect(result?.items[0]?.label).toBe('SELECT');
  });

  it('does not return suggestions without a prefix', () => {
    expect(getCompletions('SELECT ', 7)).toBeNull();
  });

  it('includes ClickHouse functions', () => {
    const labels = getCompletions('uniq', 4)?.items.map((item) => item.label);

    expect(labels).toContain('uniq');
    expect(labels).toContain('uniqExact');
  });

  it('includes ClickHouse-specific SELECT clauses from the docs', () => {
    expect(getCompletions('FIN', 3)?.items.map((item) => item.label)).toContain('FINAL');
    expect(getCompletions('PRE', 3)?.items.map((item) => item.label)).toContain('PREWHERE');
    expect(getCompletions('QUAL', 4)?.items.map((item) => item.label)).toContain('QUALIFY');
    expect(getCompletions('SAM', 3)?.items.map((item) => item.label)).toContain('SAMPLE');
  });

  it('includes ClickHouse-specific statement keywords', () => {
    expect(getCompletions('OPT', 3)?.items.map((item) => item.label)).toContain('OPTIMIZE');
    expect(getCompletions('UND', 3)?.items.map((item) => item.label)).toContain('UNDROP');
  });

  it('includes FINAL-related settings', () => {
    const labels = getCompletions('max_f', 5)?.items.map((item) => item.label);

    expect(labels).toContain('max_final_threads');
  });
});
