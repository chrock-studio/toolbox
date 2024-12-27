# Design

Example:

```ts
import { zod } from "@chrock-studio/overload";
import * as z from "zod";
import * as v from "valibot";

const fn = zod
  .overload([z.string()], (str) => console.log("overload by zod schema.", { str }))
  .valibot
  .overload([v.number()], (num) => console.log("overload by valibot schema.", { num }));

fn("233"); // <- output: "overload by zod schema.", { str: "233" }
fn(233); // <- output: "overload by valibot schema.", { num: 233 }

const fn2 = zod.overload([z.object({ name: z.string().optional() })], (entity) => console.log("entity:", entity));
```

```ts
interface Overload<Fn extends (...args: any[]) => any, BaseSchema> extends Fn {
  overload<TSchemas extends [BaseSchema, ...BaseSchema[]] | [], TFunction extends (...args: Infer<TSchemas>) => any>(
    schemas: TSchemas,
    fn: TFunction
  ): Overload<Fn & TFunction>;
  overload<TSchemas extends [BaseSchema, ...BaseSchema[]] | [], TRest extends BaseSchema, TFunction extends (...args: Infer<[...TSchemas, ...TRest[]]>) => any>(
    schemas: TSchemas,
    rest: TRest,
    fn: TFunction
  ): Overload<Fn & TFunction>;

  get zod(): ZodOverload<Fn>;
  get valibot(): ValibotOverload<Fn>;
}

type ZodOverload<Fn extends (...args: any[]) => any> = Overload<Fn, z.ZodTypeAny>;
type ValibotOverload<Fn extends (...args: any[]) => any> = Overload<Fn, v.BaseSchema<any, any, any>>;
```
