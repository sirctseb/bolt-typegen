export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface BaseObject<T> {
  child: string;
}
export interface DerivedObject<T> extends BaseObject<T> {
  otherChild: number;
}
