export interface RoomInfo {
  name: NameString;
  creator: UserID;
  members: Record<string, Member>;
}
export interface Post {
  from: UserID;
  message: MessageString;
}
export type MessageString = string;
export interface Member {
  nickname: NameString;
  isBanned: boolean;
}
export type NameString = any;
export type Timestamped<T> = T & {
  created: Created;
};
export type Created = number;
export type Modified = number;
export type PushID = string;
export type RoomID = string;
export type UserID = string;
