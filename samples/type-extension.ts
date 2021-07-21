export type PositiveInteger = number;
export type UnixTimestamp = PositiveInteger;
export type NonEmptyString = string;
export type URL = string;
export interface Test {
  time: UnixTimestamp;
  name: NonEmptyString;
  url: URL;
}
