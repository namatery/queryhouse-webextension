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
});
