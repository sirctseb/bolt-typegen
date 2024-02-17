export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type HasNullable = {
  child?: string;
};
