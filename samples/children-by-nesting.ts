export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type Child = {
  age: number;
};
export type Parent = {
  children?: FirebaseArray<string, Child>;
};
