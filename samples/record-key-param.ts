export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type StringAlias = string;
export type RecordWithKeyHost = {
  child?: FirebaseArray<StringAlias, boolean>;
};
