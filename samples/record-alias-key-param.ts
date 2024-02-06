export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type RecordAlias<K extends string, V> = FirebaseArray<K, V>;
export type RecordAliasStringKey<V> = FirebaseArray<string, V>;
export type StringAlias = string;
export type RecordAliasStringAliasKey<V> = FirebaseArray<StringAlias, V>;
export type WithChildren<V> = Record<string, V> & {
  child: string;
};
export type RecordAliasDescendant<K extends string, V> = RecordAlias<K, V>;
export type RecordAliasOrStringDescendant<K extends string, V> =
  | string
  | RecordAlias<K, V>;
