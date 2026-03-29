export const delegate = <T, This = never>(
  getter: (this: This) => T,
  setter: (this: This, value: T) => void,
) =>
  function delegate(this: This, ...args: [] | [value: T]) {
    if (args.length) setter.apply(this, args);
    else return getter.apply(this);
  } as Delegate<T, This>;
export interface Delegate<T, This = never> {
  (this: This): T;
  (this: This, value: T): void;
}
