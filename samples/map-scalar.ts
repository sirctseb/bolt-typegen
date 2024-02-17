export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type Test = {
  s1: ShortString;
  s2: AliasString;
  m1?: FirebaseArray<ShortString, number>;
  m2?: FirebaseArray<AliasString, number>;
};
export type AliasString = ShortString;
export type ShortString = string;
