export type RoomInfo = (Object) & {
  name: NameString;
  creator: UserID;
  members: { [key: string]: Member; };
}
export type Post = (Object) & {
  from: UserID;
  message: MessageString;
}
export type MessageString = (string);
export type Member = (Object) & {
  nickname: NameString;
  isBanned: boolean;
}
export type NameString = (any);
export type Timestamped<T> = (T) & {
  created: Created;
}
export type Created = (number);
export type Modified = (number);
export type PushID = (string);
export type RoomID = (string);
export type UserID = (string);
