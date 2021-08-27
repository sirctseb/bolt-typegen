export interface Test {
  s1: ShortString;
  s2: AliasString;
  m1?: Record<ShortString, number>;
  m2?: Record<AliasString, number>;
}
export type AliasString = ShortString;
export type ShortString = string;
