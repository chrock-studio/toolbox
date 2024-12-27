import type { UnionToIntersection } from "typescript-lodash/lib/common";
import type { NotEmptyArray, MatchData } from "../types";
import { Callable } from "../utils/callable";
import { throwIfNullish } from "../utils/throw-if-nullish";
import * as matcher from "../matcher";

type NotOverloadIssue = () => "No overload matched";
type Signature<TSchemas extends MatchData[]> = TSchemas extends { length: 0 }
  ? NotOverloadIssue
  : UnionToIntersection<TSchemas[number][1]>;

export class OverloadedFn<
  const TData extends NotEmptyArray<MatchData> | [] = [],
  TSignature extends Signature<TData> = Signature<TData>,
> extends Callable<TSignature> {
  protected data: TData;

  constructor(data: TData) {
    super(((...args: any[]) => {
      return throwIfNullish(
        this.data.findLast(([matcher]) => matcher(args)),
        () => new Error("No overload matched"),
      )[1](...args);
    }) as TSignature);
    this.data = data;
  }
}

/**
 * @example
 * 
    ```ts
    import * as z from "zod";
    import { zod } from "../matcher";

    const fn = overload(
      zod(
        [z.string()],
        (str) => console.log("first overload", { str })
      ),
    ).overload(
      zod(
        [z.number()],
        z.unknown(),
        (num, ...rest) => console.log("second overload", { num, rest })
      ),
    );

    fn("hello"); // output: "first overload" { str: "hello" }
    fn(1, 2, 3); // output: "second overload" { num: 1, rest: [2, 3] }
    ```
 */
export class Overload<
  const TData extends NotEmptyArray<MatchData> | [] = [],
> extends OverloadedFn<TData> {
  /**
   * Creates a new instance of static overloaded function.
   *
   * @returns a new instance of Overload with the same data
   */
  freeze = () => {
    return new OverloadedFn(this.data);
  };

  /**
   * Overloads the function with a new signature.
   *
   * @param signature - the new signature to overload the function with
   * @returns a new instance of Overload with the new signature
   */
  overload = <Fn extends (...args: any[]) => any>(signature: MatchData<Fn>) => {
    return new (this.constructor as any)([...this.data, signature]) as Overload<
      [...TData, MatchData<Fn>]
    >;
  };

  /**
   * Overloads the function with a new legacy signature.
   *
   * @see {@link matcher.legacy}
   */
  legacy = ((...args: any[]) => {
    return this.overload(
      matcher.legacy(
        // @ts-expect-error -- ignore
        ...args,
      ),
    );
  }) as unknown as LegacyOverloadFn<TData>;

  /**
   * Overloads the function with a new valibot signature.
   *
   * @see {@link matcher.valibot}
   */
  valibot = ((...args: any[]) => {
    return this.overload(
      matcher.valibot(
        // @ts-expect-error -- ignore
        ...args,
      ),
    );
  }) as unknown as ValibotOverloadFn<TData>;

  /**
   * Overloads the function with a new zod signature.
   *
   * @see {@link matcher.zod}
   */
  zod = ((...args: any[]) => {
    return this.overload(
      matcher.zod(
        // @ts-expect-error -- ignore
        ...args,
      ),
    );
  }) as unknown as ZodOverloadFn<TData>;
}

interface LegacyOverloadFn<TData extends NotEmptyArray<MatchData> | [] = []> {
  <
    const TItems extends NotEmptyArray<matcher.LegacySchema>,
    Fn extends matcher.LegacySignature<TItems>,
  >(
    items: TItems,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;

  <
    const TItems extends NotEmptyArray<matcher.LegacySchema>,
    TRest extends matcher.LegacySchema,
    Fn extends matcher.LegacySignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;
}

import type * as v from "valibot";
interface ValibotOverloadFn<TData extends NotEmptyArray<MatchData> | [] = []> {
  <const TItems extends v.TupleItems, Fn extends matcher.ValibotSignature<TItems>>(
    items: TItems,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;

  <
    const TItems extends v.TupleItems,
    TRest extends v.BaseSchema<any, any, any>,
    Fn extends matcher.ValibotSignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;
}

import type * as z from "zod";
interface ZodOverloadFn<TData extends NotEmptyArray<MatchData> | [] = []> {
  <const TItems extends z.ZodTupleItems, Fn extends matcher.ZodSignature<TItems>>(
    items: TItems,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;

  <
    const TItems extends z.ZodTupleItems,
    TRest extends z.ZodTypeAny,
    Fn extends matcher.ZodSignatureWithRest<TItems, TRest>,
  >(
    items: TItems,
    rest: TRest,
    fn: Fn,
  ): Overload<[...TData, MatchData<Fn>]>;
}

export const { overload, valibot, legacy, zod } = new Overload([]);
