export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface MapToUnion {
  field?: FirebaseArray<string, string | number>;
}
