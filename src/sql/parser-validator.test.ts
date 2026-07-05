import { describe, expect, it } from 'vitest';
import { runParserValidation } from './parser-validator';

describe('runParserValidation', () => {
  it('does not report parser errors for empty SQL', async () => {
    await expect(runParserValidation('   ')).resolves.toEqual([]);
  });

  it('reports parser errors for invalid SQL', async () => {
    const diagnostics = await runParserValidation('SELECT ???');

    expect(diagnostics[0]?.source).toBe('parser');
    expect(diagnostics[0]?.message).toContain('Parser:');
    expect(diagnostics[0]?.range).toEqual({ start: 7, end: 8 });
  });
});
