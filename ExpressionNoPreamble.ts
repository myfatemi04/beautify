import * as types from "@babel/types";

type ExpressionNoPreamble =
  | types.ArrowFunctionExpression
  | types.AwaitExpression
  | types.BindExpression
  | types.ClassExpression
  | types.DoExpression
  | types.Identifier
  | types.Import
  | types.JSXElement
  | types.JSXFragment
  | types.Literal
  | types.MetaProperty
  | types.OptionalCallExpression
  | types.PipelinePrimaryTopicReference
  | types.RecordExpression
  | types.TupleExpression
  | types.Super
  | types.TaggedTemplateExpression
  | types.ThisExpression
  | types.TSAsExpression
  | types.TSNonNullExpression
  | types.TSTypeAssertion
  | types.TypeCastExpression
  | types.UpdateExpression
  | types.YieldExpression;

export default ExpressionNoPreamble;
