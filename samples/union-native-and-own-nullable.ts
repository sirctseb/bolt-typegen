export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type UnionExtender = (number | Object) & {
  myField?: string;
};
