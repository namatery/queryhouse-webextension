import { describe, expect, it } from 'vitest';
import { runLocalDiagnostics } from './diagnostics';

describe('runLocalDiagnostics', () => {
  it('reports unclosed strings', () => {
    expect(runLocalDiagnostics("SELECT 'abc;").some((diagnostic) => diagnostic.message.includes('Unclosed'))).toBe(true);
  });

  it('reports unmatched brackets', () => {
    expect(runLocalDiagnostics('SELECT (1;').some((diagnostic) => diagnostic.message.includes('Unmatched'))).toBe(true);
  });

  it('reports dangling commas', () => {
    expect(runLocalDiagnostics('SELECT a, FROM t;').some((diagnostic) => diagnostic.message.includes('dangling comma'))).toBe(true);
  });

  it('warns about missing semicolons', () => {
    expect(runLocalDiagnostics('SELECT 1').some((diagnostic) => diagnostic.message.includes('trailing semicolon'))).toBe(true);
  });

  it('warns when FINAL appears before a table alias', () => {
    const diagnostics = runLocalDiagnostics('SELECT x FROM mytable FINAL AS t;');

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('FINAL must come after the table alias'))).toBe(true);
  });

  it('allows FINAL after a table alias', () => {
    const diagnostics = runLocalDiagnostics('SELECT x FROM mytable AS t FINAL;');

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('FINAL must come after the table alias'))).toBe(false);
  });
});
