export type FirebaseArray<K extends string, T> = Record<K, T> | T[];
export interface TemplateType<T> {
  child: T | string;
}
export interface StringHost {
  keepAlive: string;
  child: TemplateType<string>;
}
export interface NullHost {
  keepAlive: string;
  child?: TemplateType<null>;
}
