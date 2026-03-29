import { delegate } from "@chrock-studio/shared/delegate";
import { signal } from "alien-signals";
import { untrack } from "./blocks";

export const extern = <T>(
  getter: (track: () => void) => T,
  setter: (trigger: () => void, value: T) => void,
) => {
  const version = signal(0);
  const track = () => version();
  const trigger = () => version(untrack(() => version()) + 1);

  return delegate(
    () => getter(track),
    (value) => setter(trigger, value),
  );
};
