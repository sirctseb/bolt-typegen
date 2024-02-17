export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type ObjectType = {
  myField: string;
};
export type UnionExtender = number | ObjectType;
