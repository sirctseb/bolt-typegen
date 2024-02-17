export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type BaseObject = {
  child: string;
};
export type DerivedObject = BaseObject & {
  otherChild: number;
};
