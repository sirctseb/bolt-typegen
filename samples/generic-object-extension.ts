export interface BaseObject<T> {
  child: string;
}

export interface DerivedObject<T> extends BaseObject<T> {
  otherChild: number;
}
