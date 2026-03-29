export type Flatten<T> = T extends object ? { [key in keyof T]: T[key] } : T;
