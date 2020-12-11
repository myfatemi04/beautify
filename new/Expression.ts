import { AssignmentOperator, BinaryOperator, UnaryOperator } from "./Operators";
import {
  Statement,
  Block,
  ExpressionStatement,
  IfStatement,
  ReturnStatement,
} from "./Statement";
import * as types from "@babel/types";
import { Argument } from "./Argument";
import { Pattern } from "./Pattern";
import { parameterFromBabel } from "./Parameter";

type Parent = {
  node: Statement | Expression;
  replaceThis: (replacement: Expression) => any;
};

export class Expression {
  parent: Parent;

  getParent() {
    return this.parent;
  }

  beautify() {}

  negated(): Expression {
    return new UnaryExpression("!", this);
  }

  statement(): ExpressionStatement {
    return new ExpressionStatement(this);
  }

  static fromBabel(babel: types.Expression | types.PrivateName): Expression {
    switch (babel.type) {
      // case "ArrayExpression":

      // case "ObjectExpression":

      // case "AssignmentExpression":
      //   break;

      case "SequenceExpression":
        return new SequenceExpression(
          babel.expressions.map((expression) =>
            Expression.fromBabel(expression)
          )
        );

      case "BinaryExpression":
        return new BinaryExpression(
          babel.operator,
          Expression.fromBabel(babel.left),
          Expression.fromBabel(babel.right)
        );

      case "LogicalExpression":
        return new LogicalExpression(
          babel.operator,
          Expression.fromBabel(babel.left),
          Expression.fromBabel(babel.right)
        );

      case "UnaryExpression":
        return new UnaryExpression(
          babel.operator,
          Expression.fromBabel(babel.argument)
        );

      case "CallExpression":
				return CallExpression.fromBabel(babel);
				
			case "FunctionExpression":
				return FunctionExpression.fromBabel(babel);

      default:
        throw new Error("Expression.fromBabel(): needs type " + babel.type);
    }
  }
}

export class Identifier extends Expression {
  constructor(public name: string) {
    super();
  }
}

export type Assignable = Identifier;

export class AssignmentExpression extends Expression {
  constructor(
    public operator: AssignmentOperator,
    public left: Assignable,
    public right: Expression
  ) {
    super();
  }
}

export class SequenceExpression extends Expression {
  constructor(public expressions: Expression[]) {
    super();
  }
}

export class BinaryExpression extends Expression {
  constructor(
    public operator: BinaryOperator,
    public left: Expression,
    public right: Expression
  ) {
    super();
  }
}

export class UnaryExpression extends Expression {
  constructor(public operator: UnaryOperator, public argument: Expression) {
    super();
  }

  negated(): Expression {
    if (this.operator === "!") {
      return this.argument;
    } else {
      return super.negated();
    }
  }
}

export class NullExpression extends Expression {}

export class FunctionParameter {
  constructor(public parameter: Assignable, public defaultValue: Expression) {}
}

export class FunctionExpression extends Expression {
  constructor(
    public parameters: FunctionParameter[],
    public statements: Statement[]
  ) {
    super();
	}
	
	static fromBabel(babel: types.FunctionExpression) {
		let parameters = [];
		for (let param of babel.params) {
			parameters.push(parameterFromBabel(param));
		}
		let body = [];
	}
}

export class ArrowFunctionExpression extends Expression {
  constructor(
    public parameters: FunctionParameter[],
    public body: Block | Expression
  ) {
    super();
  }
}

export class ConditionalExpression extends Expression {
  constructor(
    public test: Expression,
    public consequent: Expression,
    public alternate: Expression
  ) {
    super();
  }

  beautify() {
    // If found in an ExpressionStatement, spread into an If statement.
    if (this.parent.node instanceof ExpressionStatement) {
      this.parent.node.replace(
        new IfStatement(
          this.test,
          new ExpressionStatement(this.consequent),
          new ExpressionStatement(this.alternate)
        )
      );
    }

    // If found in a ReturnStatement, spread into an If combined with a return.
    if (this.parent.node instanceof ReturnStatement) {
      this.parent.node.replace(
        new IfStatement(
          this.test,
          new ReturnStatement(this.consequent),
          new ReturnStatement(this.alternate)
        )
      );
    }

    // If found in an AssignmentExpression which is in an ExpressionStatement,
    // spread into an If combined with an expression.
    if (this.parent.node instanceof AssignmentExpression) {
      if (this.parent.node.parent.node instanceof ExpressionStatement) {
        this.parent.node.parent.node.replace(
          new IfStatement(
            this.test,
            new ExpressionStatement(
              new AssignmentExpression(
                this.parent.node.operator,
                this.parent.node.left,
                this.consequent
              )
            ),
            new ExpressionStatement(
              new AssignmentExpression(
                this.parent.node.operator,
                this.parent.node.left,
                this.alternate
              )
            )
          )
        );
      }
    }
  }
}

export type LogicalOperator = "&&" | "||" | "??";

// Expressions such as "a && b" or "c || d"
export class LogicalExpression extends Expression {
  constructor(
    public operator: LogicalOperator,
    public left: Expression,
    public right: Expression
  ) {
    super();
  }

  beautify() {
    // If something like (expression) && (function call),
    // spread into if (expression) { function call }.
    if (this.parent.node instanceof ExpressionStatement) {
      if (this.operator === "&&") {
        this.parent.node.replace(
          new IfStatement(this.left, this.right.statement())
        );
      } else if (this.operator === "||") {
        this.parent.node.replace(
          new IfStatement(this.left.negated(), this.right.statement())
        );
      } else if (this.operator === "??") {
        this.parent.node.replace(
          new IfStatement(
            new BinaryExpression("==", this.left, new NullExpression()),
            this.right.statement()
          )
        );
      }
    }
  }
}

export class SpreadElement {
  constructor(public argument: Expression) {}

  beautify() {
    this.argument.beautify();
  }
}

export class CallExpression extends Expression {
  constructor(public callee: Expression, public args: Argument[]) {
    super();
  }

  beautify() {
    this.callee.beautify();

    for (let arg of this.args) {
      arg.beautify();
    }
  }

  static fromBabel(expression: types.CallExpression) {
    if (types.isV8IntrinsicIdentifier(expression.callee)) {
      throw new Error(
        "CallExpression.fromBabel() doesn't handle V8IntrinsicIdentifier"
      );
    }

    let callee = Expression.fromBabel(expression.callee);
    let args = expression.arguments.map((arg) => {
      if (types.isExpression(arg)) {
        return Expression.fromBabel(arg);
      } else if (types.isSpreadElement(arg)) {
        return new SpreadElement(Expression.fromBabel(arg.argument));
      } else {
        throw new Error(
          "CallExpression.fromBabel() doesn't handle " + arg.type
        );
      }
    });

    return new CallExpression(callee, args);
  }
}
