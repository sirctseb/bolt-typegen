export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface Product {
  name: string;
  cost: number;
}
export type Serialized<T> = T & {
  counter: Counter;
};
export type Counter = number;
