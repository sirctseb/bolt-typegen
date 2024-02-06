export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface BaseObject {
  child: string;
}
export interface DerivedObject extends BaseObject {
  otherChild: number;
}
