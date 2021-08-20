export interface App {
  users?: Record<string, User>;
  products?: Record<string, Product>;
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
