export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type MapToUnion = {
  field?: FirebaseArray<string, string | number>;
};
