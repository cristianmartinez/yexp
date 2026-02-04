import { type Token, TokenType } from './types.js';

const KEYWORDS = new Map<string, TokenType>([
  ['true', TokenType.True],
  ['false', TokenType.False],
  ['null', TokenType.Null],
]);

export class LexerError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(message);
    this.name = 'LexerError';
  }
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  function advance(): string {
    return source[pos++] ?? '\0';
  }

  function match(expected: string): boolean {
    if (source[pos] === expected) {
      pos++;
      return true;
    }
    return false;
  }

  function addToken(type: TokenType, value: string, start: number): void {
    tokens.push({ type, value, position: start });
  }

  function readString(quote: string, start: number): void {
    let value = '';
    while (pos < source.length && source[pos] !== quote) {
      if (source[pos] === '\\') {
        pos++;
        const escaped = advance();
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          default:
            value += escaped;
            break;
        }
      } else {
        value += advance();
      }
    }
    if (pos >= source.length) {
      throw new LexerError('Unterminated string literal', start);
    }
    pos++; // closing quote
    addToken(TokenType.String, value, start);
  }

  function readTemplateLiteral(start: number): void {
    let value = '';
    let isFirst = true;

    while (pos < source.length) {
      const ch = source[pos]!;

      if (ch === '`') {
        pos++;
        if (isFirst) {
          addToken(TokenType.TemplateNoSub, value, start);
        } else {
          addToken(TokenType.TemplateTail, value, start);
        }
        return;
      }

      if (ch === '$' && source[pos + 1] === '{') {
        if (isFirst) {
          addToken(TokenType.TemplateHead, value, start);
        } else {
          addToken(TokenType.TemplateMiddle, value, start);
        }
        pos += 2; // skip ${

        // Tokenize the interpolation expression
        let braceDepth = 1;
        while (pos < source.length && braceDepth > 0) {
          if (source[pos] === '{') braceDepth++;
          if (source[pos] === '}') {
            braceDepth--;
            if (braceDepth === 0) break;
          }
          scanToken();
        }
        if (pos >= source.length) {
          throw new LexerError('Unterminated template interpolation', start);
        }
        pos++; // skip }

        isFirst = false;
        value = '';
        continue;
      }

      if (ch === '\\') {
        pos++;
        const escaped = advance();
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '`':
            value += '`';
            break;
          case '$':
            value += '$';
            break;
          case '\\':
            value += '\\';
            break;
          default:
            value += escaped;
            break;
        }
      } else {
        value += advance();
      }
    }

    throw new LexerError('Unterminated template literal', start);
  }

  function readNumber(start: number): void {
    while (pos < source.length && isDigit(source[pos]!)) pos++;
    if (
      pos < source.length &&
      source[pos] === '.' &&
      pos + 1 < source.length &&
      isDigit(source[pos + 1]!)
    ) {
      pos++; // skip dot
      while (pos < source.length && isDigit(source[pos]!)) pos++;
    }
    addToken(TokenType.Number, source.slice(start, pos), start);
  }

  function readIdentifier(start: number): void {
    while (pos < source.length && isIdentChar(source[pos]!)) pos++;
    const word = source.slice(start, pos);
    const keyword = KEYWORDS.get(word);
    addToken(keyword ?? TokenType.Identifier, word, start);
  }

  function scanToken(): void {
    skipWhitespace();
    if (pos >= source.length) return;

    const start = pos;
    const ch = advance();

    switch (ch) {
      case '(':
        addToken(TokenType.LeftParen, '(', start);
        break;
      case ')':
        addToken(TokenType.RightParen, ')', start);
        break;
      case '[':
        addToken(TokenType.LeftBracket, '[', start);
        break;
      case ']':
        addToken(TokenType.RightBracket, ']', start);
        break;
      case '{':
        addToken(TokenType.LeftBrace, '{', start);
        break;
      case '}':
        addToken(TokenType.RightBrace, '}', start);
        break;
      case ',':
        addToken(TokenType.Comma, ',', start);
        break;
      case ':':
        addToken(TokenType.Colon, ':', start);
        break;
      case '*':
        addToken(TokenType.Star, '*', start);
        break;
      case '/':
        addToken(TokenType.Slash, '/', start);
        break;
      case '%':
        addToken(TokenType.Percent, '%', start);
        break;
      case '+':
        if (match('+')) {
          addToken(TokenType.PlusPlus, '++', start);
        } else {
          addToken(TokenType.Plus, '+', start);
        }
        break;
      case '-':
        if (match('-')) {
          addToken(TokenType.MinusMinus, '--', start);
        } else {
          addToken(TokenType.Minus, '-', start);
        }
        break;
      case '<':
        if (match('<')) {
          addToken(TokenType.LessLess, '<<', start);
        } else if (match('=')) {
          addToken(TokenType.LessEqual, '<=', start);
        } else {
          addToken(TokenType.Less, '<', start);
        }
        break;
      case '>':
        if (match('=')) {
          addToken(TokenType.GreaterEqual, '>=', start);
        } else {
          addToken(TokenType.Greater, '>', start);
        }
        break;
      case '=':
        if (match('=')) {
          addToken(TokenType.EqualEqual, '==', start);
        } else if (match('>')) {
          addToken(TokenType.Arrow, '=>', start);
        } else {
          addToken(TokenType.Equal, '=', start);
        }
        break;
      case '!':
        if (match('=')) {
          addToken(TokenType.BangEqual, '!=', start);
        } else {
          addToken(TokenType.Bang, '!', start);
        }
        break;
      case '&':
        if (match('&')) {
          addToken(TokenType.AmpersandAmpersand, '&&', start);
        } else {
          throw new LexerError(`Unexpected character '&'`, start);
        }
        break;
      case '|':
        if (match('|')) {
          addToken(TokenType.PipePipe, '||', start);
        } else if (match('>')) {
          addToken(TokenType.PipeGreater, '|>', start);
        } else {
          throw new LexerError(`Unexpected character '|'`, start);
        }
        break;
      case '.':
        if (source[pos] === '.' && source[pos + 1] === '.') {
          pos += 2;
          addToken(TokenType.DotDotDot, '...', start);
        } else {
          addToken(TokenType.Dot, '.', start);
        }
        break;
      case '"':
      case "'":
        readString(ch, start);
        break;
      case '`':
        readTemplateLiteral(start);
        break;
      default:
        if (isDigit(ch)) {
          pos--; // back up to re-read from start
          readNumber(start);
        } else if (isIdentStart(ch)) {
          pos--;
          readIdentifier(start);
        } else {
          throw new LexerError(`Unexpected character '${ch}'`, start);
        }
    }
  }

  function skipWhitespace(): void {
    while (pos < source.length && isWhitespace(source[pos]!)) pos++;
  }

  while (pos < source.length) {
    scanToken();
  }

  addToken(TokenType.EOF, '', pos);
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}

function isIdentChar(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}
