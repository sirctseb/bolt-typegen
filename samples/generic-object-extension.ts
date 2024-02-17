export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type BaseObject<T> = {
  child: string;
};
export type DerivedObject<T> = BaseObject<T> & {
  otherChild: number;
};
