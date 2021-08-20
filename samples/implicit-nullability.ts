export interface A {
  mapField?: Record<string, boolean>;
}
export interface B {
  mapField?: Record<string, boolean>;
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
