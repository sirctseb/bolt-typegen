export interface Product {
  name: string;
  cost: number;
}
export type Serialized<T> = T & {
  counter: Counter;
}
export type Counter = number;
