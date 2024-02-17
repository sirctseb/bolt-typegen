export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type A = {
  mapField?: FirebaseArray<string, boolean>;
};
export type B = {
  mapField?: FirebaseArray<string, boolean>;
};
export type C = {
  nullableField?: boolean;
};
export type CHost = {
  c?: C;
};
export type E = {
  nullableField?: boolean;
};
export type D = {
  nullableField?: boolean;
  e?: E;
};
export type DHost = {
  d?: D;
};
