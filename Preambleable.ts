import * as types from "@babel/types";

export default interface Preambleable<T> {
  preamble: types.Statement[];
  value: T;
}