import type {
  ASTNode,
  AppendNode,
  ArrayLiteralNode,
  AssignmentNode,
  BinaryOpNode,
  CallNode,
  IdentifierNode,
  IndexAccessNode,
  LambdaNode,
  LiteralNode,
  LogicalOpNode,
  MemberAccessNode,
  NullCoalescingNode,
  ObjectLiteralNode,
  ObjectProperty,
  PipeNode,
  PredicateIndexNode,
  RecursiveDescentNode,
  SpreadElementNode,
  TemplateLiteralNode,
  TemplatePart,
  TernaryNode,
  Token,
  UnaryOpNode,
  UpdateNode,
  WildcardIndexNode,
} from './types.js';
import { TokenType } from './types.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

// Precedence levels (higher = tighter binding)
enum Prec {
  None = 0,
  Lambda = 1, // =>
  Assignment = 2, // =, <<
  Ternary = 3, // ? :
  NullCoalescing = 4, // ??
  Or = 5, // ||
  And = 6, // &&
  Equality = 7, // == !=
  Comparison = 8, // < > <= >=
  Addition = 9, // + -
  Multiplication = 10, // * / %
  Pipe = 11, // |>
  Unary = 12, // ! - ...
  Call = 13, // member access, index, call
}

export function parse(tokens: Token[]): ASTNode {
  let pos = 0;
  let inDotShorthand = false;

  function current(): Token {
    const token = tokens[pos];
    if (!token) throw new ParseError('Unexpected end of input', pos);
    return token;
  }

  function peek(): TokenType {
    return current().type;
  }

  function advance(): Token {
    const token = current();
    pos++;
    return token;
  }

  function expect(type: TokenType): Token {
    const token = current();
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${type} but got ${token.type} ('${token.value}')`,
        token.position,
      );
    }
    return advance();
  }

  function match(type: TokenType): boolean {
    if (peek() === type) {
      advance();
      return true;
    }
    return false;
  }

  // ─── Entry ──────────────────────────────────────────────────────────────

  function parseExpression(minPrec: Prec = Prec.None): ASTNode {
    let left = parsePrefix();
    left = parsePostfix(left);

    while (true) {
      const prec = infixPrecedence(peek());
      if (prec <= minPrec) break;
      left = parseInfix(left, prec);
    }

    return left;
  }

  // ─── Prefix (atoms + unary) ─────────────────────────────────────────────

  function parsePrefix(): ASTNode {
    switch (peek()) {
      case TokenType.Number:
        return parseNumber();
      case TokenType.String:
        return parseString();
      case TokenType.True:
      case TokenType.False:
        return parseBoolean();
      case TokenType.Null:
        return parseNull();
      case TokenType.Identifier:
        return parseIdentifier();
      case TokenType.LeftParen:
        return parseParenOrLambda();
      case TokenType.LeftBracket:
        return parseArrayLiteral();
      case TokenType.LeftBrace:
        return parseObjectLiteral();
      case TokenType.Bang:
        return parseUnary();
      case TokenType.Minus:
        return parseUnary();
      case TokenType.Dot:
        return inDotShorthand ? parseDotMemberAccess() : parseDotShorthand();
      case TokenType.DotDotDot:
        return parseSpread();
      case TokenType.TemplateNoSub:
        return parseTemplateNoSub();
      case TokenType.TemplateHead:
        return parseTemplateLiteral();
      default:
        throw new ParseError(
          `Unexpected token ${current().type} ('${current().value}')`,
          current().position,
        );
    }
  }

  function parseNumber(): LiteralNode {
    const token = advance();
    return { type: 'Literal', value: Number(token.value), raw: token.value };
  }

  function parseString(): LiteralNode {
    const token = advance();
    return { type: 'Literal', value: token.value, raw: `"${token.value}"` };
  }

  function parseBoolean(): LiteralNode {
    const token = advance();
    return { type: 'Literal', value: token.type === TokenType.True, raw: token.value };
  }

  function parseNull(): LiteralNode {
    const token = advance();
    return { type: 'Literal', value: null, raw: token.value };
  }

  function parseIdentifier(): IdentifierNode {
    const token = advance();
    return { type: 'Identifier', name: token.value };
  }

  function parseParenOrLambda(): ASTNode {
    const savedPos = pos;
    advance(); // skip (

    // Empty parens - could be () => ... or error
    if (peek() === TokenType.RightParen) {
      advance(); // skip )
      if (peek() === TokenType.Arrow) {
        advance(); // skip =>
        const body = parseExpression();
        return { type: 'Lambda', params: [], body } as LambdaNode;
      }
      throw new ParseError('Empty parentheses', current().position);
    }

    // Try to parse as parameter list
    if (peek() === TokenType.Identifier) {
      const tentativeParams: string[] = [];
      let looksLikeParams = true;

      tentativeParams.push(current().value);
      advance();

      while (peek() === TokenType.Comma) {
        advance(); // skip comma
        if (peek() !== TokenType.Identifier) {
          looksLikeParams = false;
          break;
        }
        tentativeParams.push(current().value);
        advance();
      }

      if (looksLikeParams && peek() === TokenType.RightParen) {
        const afterParen = pos + 1;
        if (afterParen < tokens.length && tokens[afterParen]?.type === TokenType.Arrow) {
          advance(); // skip )
          advance(); // skip =>
          const body = parseExpression();
          return { type: 'Lambda', params: tentativeParams, body } as LambdaNode;
        }
      }
    }

    // Not a lambda - backtrack and parse as grouping
    pos = savedPos;
    advance(); // skip ( again
    const expr = parseExpression();
    expect(TokenType.RightParen);
    return expr;
  }

  function parseDotShorthand(): LambdaNode {
    inDotShorthand = true;
    advance(); // skip .
    const prop = expect(TokenType.Identifier);

    let body: ASTNode = {
      type: 'MemberAccess',
      object: { type: 'Identifier', name: '$it' },
      property: prop.value,
    } as MemberAccessNode;

    body = parsePostfix(body);

    while (true) {
      const prec = infixPrecedence(peek());
      if (prec <= Prec.None) break;
      body = parseInfix(body, prec);
    }

    inDotShorthand = false;
    return { type: 'Lambda', params: ['$it'], body };
  }

  function parseDotMemberAccess(): MemberAccessNode {
    advance(); // skip .
    const prop = expect(TokenType.Identifier);
    return {
      type: 'MemberAccess',
      object: { type: 'Identifier', name: '$it' },
      property: prop.value,
    };
  }

  function parseArrayLiteral(): ArrayLiteralNode {
    advance(); // skip [
    const elements: ASTNode[] = [];
    while (peek() !== TokenType.RightBracket && peek() !== TokenType.EOF) {
      elements.push(parseExpression(Prec.Assignment));
      if (!match(TokenType.Comma)) break;
    }
    expect(TokenType.RightBracket);
    return { type: 'ArrayLiteral', elements };
  }

  function parseObjectLiteral(): ObjectLiteralNode {
    advance(); // skip {
    const properties: ObjectProperty[] = [];
    while (peek() !== TokenType.RightBrace && peek() !== TokenType.EOF) {
      if (peek() === TokenType.DotDotDot) {
        const spread = parseSpread();
        properties.push({
          key: '__spread__',
          value: spread,
          shorthand: false,
        });
      } else {
        const key = expect(TokenType.Identifier);
        if (match(TokenType.Colon)) {
          const value = parseExpression(Prec.Assignment);
          properties.push({ key: key.value, value, shorthand: false });
        } else {
          // Shorthand: { name } => { name: name }
          properties.push({
            key: key.value,
            value: { type: 'Identifier', name: key.value },
            shorthand: true,
          });
        }
      }
      if (!match(TokenType.Comma)) break;
    }
    expect(TokenType.RightBrace);
    return { type: 'ObjectLiteral', properties };
  }

  function parseUnary(): UnaryOpNode {
    const token = advance();
    const operator = token.value as '-' | '!';
    const operand = parseExpression(Prec.Unary);
    return { type: 'UnaryOp', operator, operand };
  }

  function parseSpread(): SpreadElementNode {
    advance(); // skip ...
    const argument = parseExpression(Prec.Assignment);
    return { type: 'SpreadElement', argument };
  }

  function parseTemplateNoSub(): TemplateLiteralNode {
    const token = advance();
    return {
      type: 'TemplateLiteral',
      parts: [{ type: 'string', value: token.value }],
    };
  }

  function parseTemplateLiteral(): TemplateLiteralNode {
    const parts: TemplatePart[] = [];
    const head = advance(); // TemplateHead
    if (head.value) {
      parts.push({ type: 'string', value: head.value });
    }

    // Read expression tokens until TemplateMiddle or TemplateTail
    parts.push({ type: 'expression', value: parseExpression() });

    while (peek() === TokenType.TemplateMiddle) {
      const middle = advance();
      if (middle.value) {
        parts.push({ type: 'string', value: middle.value });
      }
      parts.push({ type: 'expression', value: parseExpression() });
    }

    const tail = expect(TokenType.TemplateTail);
    if (tail.value) {
      parts.push({ type: 'string', value: tail.value });
    }

    return { type: 'TemplateLiteral', parts };
  }

  // ─── Postfix ────────────────────────────────────────────────────────────

  function parsePostfix(expr: ASTNode): ASTNode {
    let node = expr;
    while (true) {
      if (peek() === TokenType.QuestionDot) {
        advance();
        // Check if it's ?.[expr] or ?.prop
        if (peek() === TokenType.LeftBracket) {
          advance(); // skip [

          // Check for optional wildcard ?.[*]
          if (peek() === TokenType.Star) {
            advance(); // consume *
            expect(TokenType.RightBracket);
            node = { type: 'WildcardIndex', object: node, optional: true } as WildcardIndexNode;
            continue;
          }

          // Check for optional predicate ?.[.condition] or ?.[!.condition] etc
          if (peek() === TokenType.Dot || peek() === TokenType.Bang) {
            // Parse as lambda with $it parameter
            inDotShorthand = true;
            const body = parseExpression();
            inDotShorthand = false;
            const predicate: LambdaNode = { type: 'Lambda', params: ['$it'], body };
            expect(TokenType.RightBracket);
            node = { type: 'PredicateIndex', object: node, predicate, optional: true } as PredicateIndexNode;
            continue;
          }

          // Regular optional index access
          const index = parseExpression();
          expect(TokenType.RightBracket);
          node = { type: 'IndexAccess', object: node, index, optional: true } as IndexAccessNode;
        } else if (peek() === TokenType.Dot) {
          // Optional recursive descent ?..property
          advance(); // consume the second dot
          const prop = expect(TokenType.Identifier);
          node = {
            type: 'RecursiveDescent',
            object: node,
            property: prop.value,
            optional: true,
          } as RecursiveDescentNode;
        } else {
          const prop = expect(TokenType.Identifier);
          node = {
            type: 'MemberAccess',
            object: node,
            property: prop.value,
            optional: true,
          } as MemberAccessNode;
        }
      } else if (peek() === TokenType.DotDot) {
        advance();
        const prop = expect(TokenType.Identifier);
        node = {
          type: 'RecursiveDescent',
          object: node,
          property: prop.value,
          optional: false,
        } as RecursiveDescentNode;
      } else if (peek() === TokenType.Dot) {
        advance();
        const prop = expect(TokenType.Identifier);
        node = { type: 'MemberAccess', object: node, property: prop.value } as MemberAccessNode;
      } else if (peek() === TokenType.LeftBracket) {
        advance();

        // Check for wildcard [*]
        if (peek() === TokenType.Star) {
          advance(); // consume *
          expect(TokenType.RightBracket);
          node = { type: 'WildcardIndex', object: node } as WildcardIndexNode;
          continue;
        }

        // Check for predicate [.condition] or [!.condition] etc
        if (peek() === TokenType.Dot || peek() === TokenType.Bang) {
          // Parse as lambda with $it parameter
          inDotShorthand = true;
          const body = parseExpression();
          inDotShorthand = false;
          const predicate: LambdaNode = { type: 'Lambda', params: ['$it'], body };
          expect(TokenType.RightBracket);
          node = { type: 'PredicateIndex', object: node, predicate } as PredicateIndexNode;
          continue;
        }

        // Regular index access
        const index = parseExpression();
        expect(TokenType.RightBracket);
        node = { type: 'IndexAccess', object: node, index } as IndexAccessNode;
      } else if (peek() === TokenType.LeftParen && isCallable(node)) {
        node = parseCallArgs(node);
      } else {
        break;
      }
    }

    // Postfix update (++ / --)
    if (peek() === TokenType.PlusPlus || peek() === TokenType.MinusMinus) {
      const op = advance();
      return {
        type: 'Update',
        operator: op.value as '++' | '--',
        target: node,
      } as UpdateNode;
    }

    return node;
  }

  function isCallable(node: ASTNode): boolean {
    return node.type === 'Identifier';
  }

  function parseCallArgs(callee: ASTNode): CallNode {
    advance(); // skip (
    const args: ASTNode[] = [];
    while (peek() !== TokenType.RightParen && peek() !== TokenType.EOF) {
      // Use None precedence to allow all expressions including lambdas
      args.push(parseExpression());
      if (!match(TokenType.Comma)) break;
    }
    expect(TokenType.RightParen);
    return {
      type: 'Call',
      callee: (callee as IdentifierNode).name,
      args,
    };
  }

  // ─── Infix ──────────────────────────────────────────────────────────────

  function infixPrecedence(type: TokenType): Prec {
    switch (type) {
      case TokenType.Arrow:
        return Prec.Lambda;
      case TokenType.Equal:
      case TokenType.LessLess:
        return Prec.Assignment;
      case TokenType.Question:
        return Prec.Ternary;
      case TokenType.QuestionQuestion:
        return Prec.NullCoalescing;
      case TokenType.PipePipe:
        return Prec.Or;
      case TokenType.AmpersandAmpersand:
        return Prec.And;
      case TokenType.EqualEqual:
      case TokenType.BangEqual:
      case TokenType.EqualEqualEqual:
      case TokenType.BangEqualEqual:
        return Prec.Equality;
      case TokenType.Less:
      case TokenType.Greater:
      case TokenType.LessEqual:
      case TokenType.GreaterEqual:
        return Prec.Comparison;
      case TokenType.Plus:
      case TokenType.Minus:
        return Prec.Addition;
      case TokenType.Star:
      case TokenType.Slash:
      case TokenType.Percent:
        return Prec.Multiplication;
      case TokenType.PipeGreater:
        return Prec.Pipe;
      default:
        return Prec.None;
    }
  }

  function parseInfix(left: ASTNode, prec: Prec): ASTNode {
    const token = advance();

    switch (token.type) {
      case TokenType.Arrow:
        return parseArrowLambda(left);
      case TokenType.Equal:
        return parseAssignment(left);
      case TokenType.LessLess:
        return parseAppend(left);
      case TokenType.Question:
        return parseTernary(left);
      case TokenType.QuestionQuestion:
        return parseNullCoalescing(left, prec);
      case TokenType.PipePipe:
      case TokenType.AmpersandAmpersand:
        return parseLogical(left, token, prec);
      case TokenType.PipeGreater:
        return parsePipe(left);
      default:
        return parseBinary(left, token, prec);
    }
  }

  function parseBinary(left: ASTNode, token: Token, prec: Prec): BinaryOpNode {
    const right = parseExpression(prec);
    return {
      type: 'BinaryOp',
      operator: token.value as BinaryOpNode['operator'],
      left,
      right,
    };
  }

  function parseLogical(left: ASTNode, token: Token, prec: Prec): LogicalOpNode {
    const right = parseExpression(prec);
    return {
      type: 'LogicalOp',
      operator: token.value as '&&' | '||',
      left,
      right,
    };
  }

  function parsePipe(left: ASTNode): PipeNode {
    const callee = expect(TokenType.Identifier);
    const args: ASTNode[] = [];
    if (match(TokenType.LeftParen)) {
      while (peek() !== TokenType.RightParen && peek() !== TokenType.EOF) {
        // Use None precedence to allow all expressions including lambdas
        args.push(parseExpression());
        if (!match(TokenType.Comma)) break;
      }
      expect(TokenType.RightParen);
    }
    let node: ASTNode = {
      type: 'Pipe',
      value: left,
      callee: callee.value,
      args,
    } as PipeNode;

    // Handle postfix (member access, further pipes)
    node = parsePostfix(node);

    return node as PipeNode;
  }

  function parseAssignment(target: ASTNode): AssignmentNode {
    const value = parseExpression(Prec.Assignment);
    return { type: 'Assignment', target, value };
  }

  function parseAppend(target: ASTNode): AppendNode {
    const value = parseExpression(Prec.Assignment);
    return { type: 'Append', target, value };
  }

  function parseArrowLambda(left: ASTNode): LambdaNode {
    // Left side must be an identifier (single parameter)
    if (left.type !== 'Identifier') {
      throw new ParseError(
        'Arrow function parameter must be an identifier',
        current().position,
      );
    }
    const params = [left.name];
    const body = parseExpression(Prec.Lambda);
    return { type: 'Lambda', params, body };
  }

  function parseTernary(condition: ASTNode): TernaryNode {
    const consequent = parseExpression(Prec.Assignment);
    expect(TokenType.Colon);
    const alternate = parseExpression(Prec.Assignment);
    return { type: 'Ternary', condition, consequent, alternate };
  }

  function parseNullCoalescing(left: ASTNode, prec: Prec): NullCoalescingNode {
    const right = parseExpression(prec);
    return { type: 'NullCoalescing', left, right };
  }

  // ─── Parse ──────────────────────────────────────────────────────────────

  const result = parseExpression();
  if (peek() !== TokenType.EOF) {
    throw new ParseError(
      `Unexpected token ${current().type} ('${current().value}')`,
      current().position,
    );
  }
  return result;
}
