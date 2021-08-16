export interface BaseObject {
  child: string;
}

export interface DerivedObject extends BaseObject {
  otherChild: number;
}
