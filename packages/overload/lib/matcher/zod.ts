import type { Fn, MatchData, MatcherDefinition } from "../types";
import * as z from "zod";

export type ZodSignature<TItems extends z.ZodTupleItems> = (
  ...args: z.infer<z.ZodTuple<TItems>>
) => any;

export type ZodSignatureWithRest<TItems extends z.ZodTupleItems, TRest extends z.ZodTypeAny> = (
  ...args: z.infer<z.ZodTuple<TItems, TRest>>
) => any;

export const zod: {
  <const TItems extends z.ZodTupleItems, Fn extends ZodSignature<TItems>>(
    items: TItems,
    fn: Fn,
  ): MatchData<Fn>;

  <
    const TItems extends z.ZodTupleItems,
    TRest extends z.ZodTypeAny,
    Fn extends ZodSignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): MatchData<Fn>;
} = ((...args: [items: any[], fn: Fn] | [items: any[], rest: any, fn: Fn]) => {
  const [items, rest, fn] = args.length === 3 ? args : [args[0], undefined, args[1]];
  let schema: z.ZodTuple<any, any> = z.tuple(items as []);
  if (rest) {
    schema = schema.rest(rest);
  }
  return [(args) => schema.safeParse(args).success, fn] as MatchData<Fn>;
}) satisfies MatcherDefinition;
