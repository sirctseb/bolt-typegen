export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type Product = {
  name: string;
  cost: number;
};
export type Serialized<T> = T & {
  counter: Counter;
};
export type Counter = number;
