import type { Fn, MatchData, MatcherDefinition } from "../types";
import type * as v from "valibot";

export type ValibotSignature<TItems extends v.TupleItems> = (
  ...args: v.InferOutput<v.TupleSchema<TItems, undefined>>
) => any;

export type ValibotSignatureWithRest<
  TItems extends v.TupleItems,
  TRest extends v.BaseSchema<any, any, any>,
> = (...args: v.InferOutput<v.TupleWithRestSchema<TItems, TRest, undefined>>) => any;

export const valibot: {
  <const TItems extends v.TupleItems, Fn extends ValibotSignature<TItems>>(
    items: TItems,
    fn: Fn,
  ): MatchData<Fn>;

  <
    const TItems extends v.TupleItems,
    TRest extends v.BaseSchema<any, any, any>,
    Fn extends ValibotSignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): MatchData<Fn>;
} = await Promise.resolve(import("valibot"))
  .then(
    (v) =>
      ((...args: [items: any[], fn: Fn] | [items: any[], rest: any, fn: Fn]) => {
        const [items, rest, fn] = args.length === 3 ? args : [args[0], undefined, args[1]];
        const schema: v.BaseSchema<any, any, any> = rest
          ? v.tupleWithRest(items as [], rest)
          : v.tuple(items as []);

        return [(args) => v.safeParse(schema, args).success, fn] as MatchData<Fn>;
      }) satisfies MatcherDefinition,
  )
  .catch(() => () => {
    throw new Error("Method not implemented.");
  });
