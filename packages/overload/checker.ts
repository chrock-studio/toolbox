import type { StandardSchemaV1 } from "@standard-schema/spec";

export const check = <T>(checker: (data: unknown) => data is T): StandardSchemaV1<T> => {
  return {
    "~standard": {
      version: 1,
      vendor: "@chrock-studio/overload",
      validate: (value: unknown): StandardSchemaV1.Result<T> => {
        return checker(value) ? { value } : { issues: [{ message: "Value does not match the expected type" }] };
      },
    },
  };
};
