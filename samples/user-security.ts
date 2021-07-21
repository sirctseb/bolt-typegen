export type Nickname = string;
export type UserID = string;
export type MessageString = string;
export type Timestamp = number;
export interface Message {
  user: UserID;
  message: MessageString;
  timestamp: Timestamp;
}
