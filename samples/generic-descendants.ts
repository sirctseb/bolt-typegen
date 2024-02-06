export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type NotStaticallyKnown<T> = T & {
  child: string;
};
export type NotStaticallyKnownSubType<T> = NotStaticallyKnown<T> & {
  another: string;
};
export interface ConcreteType {
  ok: string;
}
export interface DirectDescdendant extends NotStaticallyKnown<ConcreteType> {}
export interface SecondDescendant
  extends NotStaticallyKnownSubType<ConcreteType> {}
