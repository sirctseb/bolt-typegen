export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type NotStaticallyKnown<T> = T & {
  child: string;
};
export type NotStaticallyKnownSubType<T> = NotStaticallyKnown<T> & {
  another: string;
};
export type ConcreteType = {
  ok: string;
};
export type DirectDescdendant = NotStaticallyKnown<ConcreteType>;
export type SecondDescendant = NotStaticallyKnownSubType<ConcreteType>;
