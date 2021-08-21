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
