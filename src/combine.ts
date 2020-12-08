import { IdentifierAccess } from "./IdentifierAccess";

/*

This file takes care of knowing if an identifier's initial value has been used or not.
It takes care of patterns (object destructuring), default values in functions, function parameters, function bodies...

*/

export function combine(...infos: IdentifierAccess[][]): IdentifierAccess[] {
  return [].concat(...infos);
}