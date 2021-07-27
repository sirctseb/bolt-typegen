export interface Child {
  age: number;
}
export interface Parent {
  children: Record<string, Child>;
}
