export type RecordAlias<K extends symbol | string | number, V> = Record<K, V>;
export interface RecordAliasStringKey<K extends symbol | string | number, V> extends Record<string, V> {}
export type StringAlias = string;
export interface RecordAliasStringAliasKey<V> extends Map<StringAlias, V> {}
