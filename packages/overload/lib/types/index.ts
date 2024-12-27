export type Fn = (...args: any[]) => any;

export type NotEmptyArray<T> = [T, ...T[]];

export type Matcher = (args: any[]) => boolean;
export type MatchData<Fn extends (...args: any[]) => any = (...args: any[]) => any> = [Matcher, Fn];

export interface MatcherDefinition {
  <T extends (...args: any[]) => any>(schema: any, fn: T): MatchData<T>;
  <T extends (...args: any[]) => any>(schema: any, rest: any, fn: T): MatchData<T>;
}
