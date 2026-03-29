export interface MapLike<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): this;
  has(key: K): boolean;
  delete(key: K): boolean;
}

export const get: {
  <K, V>(map: MapLike<K, V>, key: K): V | undefined;
  <K, V>(map: MapLike<K, V>, key: K, defaultValue: () => V): V;
} = <K, V>(map: MapLike<K, V>, key: K, defaultValue?: () => V) => {
  let result = map.get(key);
  if (!result && defaultValue) {
    map.set(key, (result = defaultValue()));
  }
  return result;
};
