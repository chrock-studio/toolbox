import type { MatchData, MatcherDefinition, NotEmptyArray } from "../types";

export const LegacyPrimitiveSchemas = {
  string: (value: any): value is string => typeof value === "string",
  number: (value: any): value is number => typeof value === "number",
  bigint: (value: any): value is bigint => typeof value === "bigint",
  boolean: (value: any): value is boolean => typeof value === "boolean",
  symbol: (value: any): value is symbol => typeof value === "symbol",
  undefined: (value: any): value is undefined => value === undefined,
  object: (value: any): value is object => typeof value === "object",
  function: (value: any): value is (...args: any[]) => any => typeof value === "function",
};

export type LegacyPrimitiveSchema = keyof typeof LegacyPrimitiveSchemas;
export type LegacyInstanceSchema<T> = abstract new (...args: any[]) => T;
export type LegacyCustomSchema<T> = { (value: any): value is T };

export type LegacySchema =
  | LegacyPrimitiveSchema
  | LegacyInstanceSchema<any>
  | LegacyCustomSchema<any>;

export type LegacyInfer<TSchema extends LegacySchema> = TSchema extends LegacyPrimitiveSchema
  ? (typeof LegacyPrimitiveSchemas)[TSchema] extends LegacyCustomSchema<infer T>
    ? T
    : never
  : TSchema extends LegacyInstanceSchema<infer TInstance>
    ? TInstance
    : TSchema extends LegacyCustomSchema<infer T>
      ? T
      : never;
export type LegacyInferArgs<TSchemas extends [LegacySchema, ...LegacySchema[]] | []> =
  TSchemas extends []
    ? []
    : TSchemas extends [infer TSchema, ...infer Rest]
      ? TSchema extends LegacySchema
        ? [
            LegacyInfer<TSchema>,
            ...(Rest extends [LegacySchema, ...LegacySchema[]] | [] ? LegacyInferArgs<Rest> : []),
          ]
        : []
      : [];

export type LegacySignature<TSchemas extends [LegacySchema, ...LegacySchema[]] | []> = (
  ...args: LegacyInferArgs<TSchemas>
) => any;

export type LegacySignatureWithRest<
  TSchemas extends [LegacySchema, ...LegacySchema[]] | [],
  TRest extends LegacySchema,
> = (
  ...args: [
    ...LegacyInferArgs<TSchemas>,
    ...(TRest extends LegacySchema ? LegacyInfer<TRest>[] : []),
  ]
) => any;

const prepare = (...schemas: LegacySchema[]) => {
  return schemas.map((schema) => {
    switch (typeof schema) {
      case "function":
        return (value: any) => value instanceof schema || (schema as any)(value);
      case "string":
        if (schema in LegacyPrimitiveSchemas) {
          return LegacyPrimitiveSchemas[schema];
        }
    }
    throw new Error(`Unknown schema: ${schema}`);
  });
};

export const legacy: {
  <const TItems extends NotEmptyArray<LegacySchema>, Fn extends LegacySignature<TItems>>(
    items: TItems,
    fn: Fn,
  ): MatchData<Fn>;

  <
    const TItems extends NotEmptyArray<LegacySchema>,
    TRest extends LegacySchema,
    Fn extends LegacySignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): MatchData<Fn>;
} = ((
  ...args:
    | [items: LegacySchema[], fn: (...args: any[]) => any]
    | [items: LegacySchema[], rest: LegacySchema, fn: (...args: any[]) => any]
) => {
  const [items, rest, fn] = args.length === 3 ? args : [args[0], undefined, args[1]];
  const schemas = prepare(...items);
  const restSchema = rest ? prepare(rest)[0] : null;
  return [
    (args) => {
      if (schemas.length === 0) {
        return true;
      }
      if (args.length < schemas.length) {
        return false;
      }
      return (
        schemas.every((schema, index) => schema(args[index])) &&
        (!restSchema || args.slice(schemas.length).every(restSchema))
      );
    },
    fn,
  ];
}) satisfies MatcherDefinition;
