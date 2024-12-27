export const throwIfNullish = <T>(condition: T, message: () => any) => {
  if (!condition) {
    throw message();
  }

  return condition;
};
