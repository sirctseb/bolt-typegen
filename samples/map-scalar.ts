export interface Test {
  s1: ShortString;
  s2: AliasString;
  m1: { [key: string]: number; };
  m2: { [key: string]: number; };
}
export type AliasString = ShortString;
export type ShortString = string;
