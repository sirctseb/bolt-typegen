export type RecordAlias<K extends symbol | string | number, V> = Record<K, V>;
export type RecordAliasStringKey<V> = Record<string, V>;
export type StringAlias = string;
export type RecordAliasStringAliasKey<V> = Record<StringAlias, V>;
export type WithChildren<V> = Record<string, V> & {
  child: string;
};
export type RecordAliasDescendant<
  K extends symbol | string | number,
  V
> = RecordAlias<K, V>;
export type RecordAliasOrStringDescendant<
  K extends symbol | string | number,
  V
> = string | RecordAlias<K, V>;
