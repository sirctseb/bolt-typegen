export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface App {
  users?: FirebaseArray<PushID, User>;
  products?: FirebaseArray<ProductID, Product>;
}
export interface User {
  name: string;
  age: number;
}
export interface Product {
  id: ProductID;
  cost: number;
}
export type ProductID = string;
export type PushID = string;
