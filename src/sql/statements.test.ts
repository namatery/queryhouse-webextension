import { describe, expect, it } from 'vitest';
import { findCurrentStatement, getExecutableStatementText, splitSqlStatements } from './statements';

describe('splitSqlStatements', () => {
  it('splits statements on semicolons', () => {
    expect(splitSqlStatements('SELECT 1; SELECT 2;')).toEqual([
      { start: 0, end: 8, text: 'SELECT 1' },
      { start: 10, end: 18, text: 'SELECT 2' }
    ]);
  });

  it('ignores semicolons inside strings and comments', () => {
    const statements = splitSqlStatements("SELECT ';'; SELECT 2 /* ; */;");

    expect(statements).toHaveLength(2);
    expect(statements[0]?.text).toBe("SELECT ';'");
    expect(statements[1]?.text).toBe('SELECT 2 /* ; */');
  });

  it('skips leading line comments before statement text', () => {
    const sql = '-- user: 1231\n\nSELECT * FROM user_users;';

    expect(splitSqlStatements(sql)).toEqual([
      {
        start: sql.indexOf('SELECT'),
        end: sql.indexOf(';'),
        text: 'SELECT * FROM user_users'
      }
    ]);
  });

  it('skips leading block comments before statement text', () => {
    const sql = '/* user: 1231 */\nSELECT * FROM user_users;';

    expect(splitSqlStatements(sql)).toEqual([
      {
        start: sql.indexOf('SELECT'),
        end: sql.indexOf(';'),
        text: 'SELECT * FROM user_users'
      }
    ]);
  });

  it('ignores comment-only text', () => {
    expect(splitSqlStatements('-- user: 1231\n/* note */')).toEqual([]);
  });
});

describe('findCurrentStatement', () => {
  it('returns the statement containing the cursor', () => {
    const sql = 'SELECT 1;\nSELECT 2;';

    expect(findCurrentStatement(sql, sql.indexOf('2'))?.text).toBe('SELECT 2');
  });

  it('returns null for whitespace-only text', () => {
    expect(findCurrentStatement('  \n ', 0)).toBeNull();
  });
});

describe('getExecutableStatementText', () => {
  it('returns the complete statement including its semicolon', () => {
    const sql = 'SELECT 1 ;\nSELECT 2;';
    const statement = findCurrentStatement(sql, 1);

    expect(statement ? getExecutableStatementText(sql, statement) : null).toBe('SELECT 1 ;');
  });

  it('returns null for an incomplete statement', () => {
    const sql = 'SELECT 1;\nSELECT 2';
    const statement = findCurrentStatement(sql, sql.length);

    expect(statement ? getExecutableStatementText(sql, statement) : null).toBeNull();
  });
});
