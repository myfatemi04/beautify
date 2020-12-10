import * as types from "@babel/types";

export type IdentifierAccess =
  | {
      type: "get";
      id: types.Identifier;
    }
  | {
      type: "set";
      id: types.Identifier;
    }
  | {
      type: "define";
      id: types.Identifier;
    };
