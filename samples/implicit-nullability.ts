export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface A {
  mapField?: FirebaseArray<string, boolean>;
}
export interface B {
  mapField?: FirebaseArray<string, boolean>;
}
export interface C {
  nullableField?: boolean;
}
export interface CHost {
  c?: C;
}
export interface E {
  nullableField?: boolean;
}
export interface D {
  nullableField?: boolean;
  e?: E;
}
export interface DHost {
  d?: D;
}
