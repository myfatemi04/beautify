import * as types from "@babel/types";
import {
  getIdentifiersAssignmentPatternUses,
  getIdentifiersPatternUses,
} from "./pattern";
import { getIdentifiersRestElementUses } from "./restElement";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
  mergeIdentifiersOr,
} from "./IdentifierAccess";
import { FunctionParam } from "./params";

export function getIdentifiersFunctionParamsUse(
  params: FunctionParam[]
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  for (let param of params) {
    if (types.isPattern(param)) {
      // Pattern-like: all of the identifiers area "set"
      identifiers = concat(identifiers, getIdentifiersPatternUses(param));
    } else if (types.isIdentifier(param)) {
      // Identifier: this identifier is "set" (instantiated from the function)
      identifiers.define.add(param.name);
    } else if (types.isRestElement(param)) {
      // Rest element: whatever content in the Rest Element is "set"
      identifiers = concat(identifiers, getIdentifiersRestElementUses(param));
    } else if (types.isTSParameterProperty(param)) {
      // TS Parameter [e.g. constructor(private a: string)]
      // The param can be an identifier or assignment pattern and is treated
      // like it were a regular function parameter.
      if (types.isIdentifier(param.parameter)) {
        identifiers.define.add(param.parameter.name);
      } else if (types.isAssignmentPattern(param)) {
        identifiers = concat(
          identifiers,
          getIdentifiersAssignmentPatternUses(param)
        );
      } else {
        throw new Error("Invalid TS Parameter Property: " + param);
      }
    } else {
      throw new Error("Invalid function parameter: " + param);
    }
  }

  identifiers.define = mergeIdentifiersOr(identifiers.define, identifiers.set);
  identifiers.set = new Set<string>();
  return identifiers;
}
