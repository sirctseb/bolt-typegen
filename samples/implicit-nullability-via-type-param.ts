export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export type TemplateType<T> = {
  child: T | string;
};
export type StringHost = {
  keepAlive: string;
  child: TemplateType<string>;
};
export type NullHost = {
  keepAlive: string;
  child?: TemplateType<null>;
};
