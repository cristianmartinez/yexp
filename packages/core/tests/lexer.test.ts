import { describe, expect, test } from 'bun:test';
import { tokenize } from '../src/lexer.js';
import { TokenType } from '../src/types.js';

function types(source: string): TokenType[] {
  return tokenize(source).map((t) => t.type);
}

function values(source: string): string[] {
  return tokenize(source)
    .filter((t) => t.type !== TokenType.EOF)
    .map((t) => t.value);
}

describe('lexer', () => {
  describe('literals', () => {
    test('integers', () => {
      expect(types('42')).toEqual([TokenType.Number, TokenType.EOF]);
      expect(values('42')).toEqual(['42']);
    });

    test('floats', () => {
      expect(values('3.14')).toEqual(['3.14']);
    });

    test('strings (double quotes)', () => {
      expect(types('"hello"')).toEqual([TokenType.String, TokenType.EOF]);
      expect(values('"hello"')).toEqual(['hello']);
    });

    test('strings (single quotes)', () => {
      expect(values("'world'")).toEqual(['world']);
    });

    test('string escape sequences', () => {
      expect(values('"a\\nb"')).toEqual(['a\nb']);
      expect(values('"a\\tb"')).toEqual(['a\tb']);
    });

    test('booleans', () => {
      expect(types('true')).toEqual([TokenType.True, TokenType.EOF]);
      expect(types('false')).toEqual([TokenType.False, TokenType.EOF]);
    });

    test('null', () => {
      expect(types('null')).toEqual([TokenType.Null, TokenType.EOF]);
    });
  });

  describe('operators', () => {
    test('arithmetic', () => {
      expect(values('+ - * / %')).toEqual(['+', '-', '*', '/', '%']);
    });

    test('comparison', () => {
      expect(values('== != < > <= >=')).toEqual(['==', '!=', '<', '>', '<=', '>=']);
    });

    test('logical', () => {
      expect(values('&& || !')).toEqual(['&&', '||', '!']);
    });

    test('assignment and mutation', () => {
      expect(values('= ++ -- <<')).toEqual(['=', '++', '--', '<<']);
    });

    test('pipe', () => {
      expect(types('|>')).toEqual([TokenType.PipeGreater, TokenType.EOF]);
    });

    test('spread', () => {
      expect(types('...')).toEqual([TokenType.DotDotDot, TokenType.EOF]);
    });

    test('dot vs spread', () => {
      expect(types('.x')).toEqual([TokenType.Dot, TokenType.Identifier, TokenType.EOF]);
      expect(types('...x')).toEqual([TokenType.DotDotDot, TokenType.Identifier, TokenType.EOF]);
    });
  });

  describe('punctuation', () => {
    test('parens, brackets, braces', () => {
      expect(values('()[]{},:'));
      expect(types('( ) [ ] { } , :')).toEqual([
        TokenType.LeftParen,
        TokenType.RightParen,
        TokenType.LeftBracket,
        TokenType.RightBracket,
        TokenType.LeftBrace,
        TokenType.RightBrace,
        TokenType.Comma,
        TokenType.Colon,
        TokenType.EOF,
      ]);
    });
  });

  describe('identifiers', () => {
    test('simple identifiers', () => {
      expect(values('state data env')).toEqual(['state', 'data', 'env']);
    });

    test('identifiers with underscores and dollars', () => {
      expect(values('_foo $bar baz123')).toEqual(['_foo', '$bar', 'baz123']);
    });
  });

  describe('template literals', () => {
    test('no interpolation', () => {
      const tokens = tokenize('`hello`');
      expect(tokens[0]?.type).toBe(TokenType.TemplateNoSub);
      expect(tokens[0]?.value).toBe('hello');
    });

    test('single interpolation', () => {
      const tokens = tokenize('`hello ${name}!`');
      expect(tokens[0]?.type).toBe(TokenType.TemplateHead);
      expect(tokens[0]?.value).toBe('hello ');
      expect(tokens[1]?.type).toBe(TokenType.Identifier);
      expect(tokens[1]?.value).toBe('name');
      expect(tokens[2]?.type).toBe(TokenType.TemplateTail);
      expect(tokens[2]?.value).toBe('!');
    });

    test('multiple interpolations', () => {
      const tokens = tokenize('`${a} and ${b}`');
      expect(tokens[0]?.type).toBe(TokenType.TemplateHead);
      expect(tokens[0]?.value).toBe('');
      expect(tokens[1]?.type).toBe(TokenType.Identifier);
      expect(tokens[2]?.type).toBe(TokenType.TemplateMiddle);
      expect(tokens[2]?.value).toBe(' and ');
      expect(tokens[3]?.type).toBe(TokenType.Identifier);
      expect(tokens[4]?.type).toBe(TokenType.TemplateTail);
      expect(tokens[4]?.value).toBe('');
    });
  });

  describe('complex expressions', () => {
    test('path expression', () => {
      expect(values('state.user.name')).toEqual(['state', '.', 'user', '.', 'name']);
    });

    test('comparison with path', () => {
      expect(values('state.count > 0')).toEqual(['state', '.', 'count', '>', '0']);
    });

    test('pipe expression', () => {
      expect(values('state.value |> toString')).toEqual(['state', '.', 'value', '|>', 'toString']);
    });

    test('array literal with spread', () => {
      expect(values('[1, ...data.items]')).toEqual([
        '[',
        '1',
        ',',
        '...',
        'data',
        '.',
        'items',
        ']',
      ]);
    });
  });

  describe('arrow function', () => {
    test('arrow token', () => {
      const tokens = tokenize('=>');
      expect(tokens.map((t) => t.value)).toEqual(['=>', '']);
    });

    test('lambda expression', () => {
      const tokens = tokenize('(x) => x + 1');
      expect(tokens.map((t) => t.value)).toEqual(['(', 'x', ')', '=>', 'x', '+', '1', '']);
    });
  });
});
