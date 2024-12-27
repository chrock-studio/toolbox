import type { Fn } from "../types";

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Callable<TFunction extends Fn> extends Function {
  constructor(f: TFunction) {
    super();
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}
// @ts-expect-error -- It's ok, don't worry :D
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Callable<TFunction extends Fn> extends TFunction {}
