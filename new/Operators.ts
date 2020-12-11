export type AssignmentOperator = "=" | "-=" | "+=" | "*=" | "/=" | "|=" | "&=";
export type BitwiseBinaryOperator = "|" | "&" | "^";
export type BitwiseShiftOperator = ">>" | ">>>" | "<<" | "<<<";
export type VerbalBinaryOperator = "in" | "instanceof";
export type ComparisonBinaryOperator =
  | "=="
  | "==="
  | "!="
  | "!=="
  | ">"
  | "<"
  | ">="
  | "<=";

export type ArithmeticBinaryOperator = "+" | "-" | "*" | "/" | "%" | "**";

export type UnaryOperator =
  | "void"
  | "throw"
  | "delete"
  | "!"
  | "+"
  | "-"
  | "~"
  | "typeof";

export type BinaryOperator =
  | ComparisonBinaryOperator
  | ArithmeticBinaryOperator
  | BitwiseBinaryOperator
  | BitwiseShiftOperator
  | VerbalBinaryOperator;
