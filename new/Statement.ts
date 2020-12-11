import { Assignable, Expression } from "./Expression";
import * as types from "@babel/types";

export class Block {
  constructor(public statements: Statement[], public parent?: Statement) {}

  static fromBabel(statements: types.Statement[]) {
    return new Block(
      statements.map((statement) => {
        return Statement.fromBabel(statement);
      })
    );
  }
}

export class Statement {
  prev?: Statement;
  next?: Statement;
  parent: Block;

  constructor() {}

  setPrev(prev: Statement) {
    if (!this.prev) {
      this.prev = prev;
    }

    this.prev.next = this;
  }

  setNext(next: Statement) {
    if (!this.next) {
      this.next = next;
    }

    this.next.prev = this;
  }

  insertPrev(prev: Statement) {
    this.prev.setNext(prev);
    this.setPrev(prev);
  }

  insertNext(next: Statement) {
    this.next.setPrev(next);
    this.setNext(next);
  }

  replace(replacement: Statement): Statement {
    this.next.setPrev(replacement);
    this.prev.setNext(replacement);

    return replacement;
  }

  beautify() {}

  static fromBabel(babel: types.Statement) {
    switch (babel.type) {
      case "BlockStatement":
        break;
      case "IfStatement":
        return new IfStatement(
          Expression.fromBabel(babel.test),
          Statement.fromBabel(babel.consequent),
          Statement.fromBabel(babel.alternate)
        );
      case "ForStatement":
        return new ForStatement(
          babel.init.type === "VariableDeclaration"
            ? VariableDeclaration.fromBabel(babel.init)
            : Expression.fromBabel(babel.init),
          Expression.fromBabel(babel.test),
          Expression.fromBabel(babel.update),
          Statement.fromBabel(babel.body)
        );
      case "ExpressionStatement":
        return new ExpressionStatement(Expression.fromBabel(babel.expression));

      default:
        throw new Error("Statement.fromBabel(): needs type " + babel.type);
    }
  }

  toBabel(): any {}
}

export class IfStatement extends Statement {
  constructor(
    public test: Expression,
    public consequent: Statement,
    public alternate?: Statement
  ) {
    super();

    this.test.parent = {
      node: this,
      replaceThis: (replacement) => (this.test = replacement),
    };
  }

  beautify() {
    this.test.beautify();
    this.consequent.beautify();
    if (this.alternate) {
      this.alternate.beautify();
    }
  }
}

export class ExpressionStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }

  beautify() {
    this.expression.beautify();
  }
}

export class ReturnStatement extends Statement {
  constructor(public argument?: Expression) {
    super();
  }

  beautify() {
    if (this.argument) {
      this.argument.beautify();
    }
  }
}

export class ForStatement extends Statement {
  constructor(
    public init: Expression | VariableDeclaration | null,
    public test: Expression | null,
    public update: Expression | null,
    public body: Statement
  ) {
    super();
  }
}

export class WhileStatement extends Statement {
  constructor(public test: Expression, public body: Statement) {
    super();

    this.test.parent = {
      node: this,
      replaceThis: (replacement) => (this.test = replacement),
    };
  }
}

export class DoWhileStatement extends Statement {
  constructor(public test: Expression, public body: Statement) {
    super();

    this.test.parent = {
      node: this,
      replaceThis: (replacement) => (this.test = replacement),
    };
  }
}

export class VariableDeclarator {
  constructor(public left: Assignable, public right?: Expression) {}
}

export class VariableDeclarationStatement extends Statement {
  constructor(public declaration: VariableDeclaration) {
    super();
  }

  beautify() {
    for (let declaration of this.declaration.declarations) {
      // declaration.left.beautify(); Impossible to beautify an assigned thing, as of now
      declaration.right.beautify();
    }

    // Split up declarations
    if (!this.declaration.isSingleDeclaration()) {
      for (let declaration of this.declaration.getAllButLastDeclaration()) {
        this.insertPrev(
          new VariableDeclarationStatement(
            new VariableDeclaration(this.declaration.kind, [declaration])
          )
        );
      }
    }
  }
}

export class VariableDeclaration {
  constructor(
    public kind: "var" | "const" | "let",
    public declarations: VariableDeclarator[]
  ) {}

  static fromBabel(declaration: types.VariableDeclaration) {
    return new VariableDeclaration(declaration.kind, []);
  }

  isSingleDeclaration() {
    return this.declarations.length - 1;
  }

  getAllButLastDeclaration() {
    return this.declarations.slice(0, this.declarations.length - 1);
  }
}
