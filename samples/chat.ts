export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type RoomInfo = {
  name: NameString;
  creator: UserID;
  members?: FirebaseArray<string, Member>;
};
export type Post = {
  from: UserID;
  message: MessageString;
};
export type MessageString = string;
export type Member = {
  nickname: NameString;
  isBanned: boolean;
};
export type NameString = any;
export type Timestamped<T> = T & {
  created: Created;
};
export type Created = number;
export type Modified = number;
export type PushID = string;
export type RoomID = string;
export type UserID = string;
