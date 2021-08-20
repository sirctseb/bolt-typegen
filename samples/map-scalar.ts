export interface Test {
  s1: ShortString;
  s2: AliasString;
  m1?: Record<string, number>;
  m2?: Record<string, number>;
}
export type AliasString = ShortString;
export type ShortString = string;
