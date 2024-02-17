export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type App = {
  users?: FirebaseArray<PushID, User>;
  products?: FirebaseArray<ProductID, Product>;
};
export type User = {
  name: string;
  age: number;
};
export type Product = {
  id: ProductID;
  cost: number;
};
export type ProductID = string;
export type PushID = string;
