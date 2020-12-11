import * as types from "@babel/types";
import {
  getIdentifiersAssignmentPatternUses,
  getIdentifiersPatternUses,
} from "./pattern";
import { getIdentifiersRestElementUses } from "./restElement";
import { IdentifierAccess } from "./IdentifierAccess";
import { FunctionParam } from "./params";

export function getIdentifiersFunctionParamsUse(
  params: FunctionParam[]
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let param of params) {
    if (types.isPattern(param)) {
      // Pattern-like: all of the identifiers area "set"
      identifiers.push(...getIdentifiersPatternUses(param));
    } else if (types.isIdentifier(param)) {
      // Identifier: this identifier is "set" (instantiated from the function)
      identifiers.push({ type: "define", id: param });
    } else if (types.isRestElement(param)) {
      // Rest element: whatever content in the Rest Element is "set"
      identifiers.push(...getIdentifiersRestElementUses(param));
    } else if (types.isTSParameterProperty(param)) {
      // TS Parameter [e.g. constructor(private a: string)]
      // The param can be an identifier or assignment pattern and is treated
      // like it were a regular function parameter.
      if (types.isIdentifier(param)) {
        identifiers.push({ type: "define", id: param });
      } else if (types.isAssignmentPattern(param)) {
        identifiers.push(...getIdentifiersAssignmentPatternUses(param));
      } else {
        throw new Error("Invalid TS Parameter Property: " + param);
      }
    } else {
      throw new Error("Invalid function parameter: " + param);
    }
  }

  return identifiers.map((identifierAccess) => {
    // change "set" to "define"
    if (identifierAccess.type === "set") {
      return <IdentifierAccess>{
        type: "define",
        id: identifierAccess.id,
      };
    } else {
      return identifierAccess;
    }
  });
}
