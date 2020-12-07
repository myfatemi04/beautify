import * as types from "@babel/types";

export default function createHoistedVariableDeclarations(
  varnames: string[]
): types.VariableDeclaration[] {
  return varnames.map((varname) => {
    return types.variableDeclaration("let", [
      types.variableDeclarator(types.identifier(varname)),
    ]);
  });
}
