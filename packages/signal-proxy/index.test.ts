import { describe, expect, test } from "bun:test";
import { type Delegate, delegate } from "@chrock-studio/shared/delegate";
import { createSignalProxy, revocableSignalProxy } from "./index.ts";

describe("createSignalProxy", () => {
  test("basic getter/setter access", () => {
    interface TestObj {
      __name: string;
      name: Delegate<string>;
    }
    const obj: TestObj = {
      __name: "John",
      name: delegate(
        () => obj.__name,
        (val) => void (obj.__name = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    // Access getter
    expect(proxy.name$).toBe("John");

    // Set value
    proxy.name$ = "Jane";
    expect(proxy.name$).toBe("Jane");
  });

  test("multiple properties", () => {
    interface TestObj {
      __count: number;
      __name: string;
      count: Delegate<number>;
      name: Delegate<string>;
    }
    const obj: TestObj = {
      __count: 0,
      __name: "test",
      count: delegate(
        () => obj.__count,
        (val) => void (obj.__count = val),
      ),
      name: delegate(
        () => obj.__name,
        (val) => void (obj.__name = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    expect(proxy.count$).toBe(0);
    expect(proxy.name$).toBe("test");

    proxy.count$ = 10;
    proxy.name$ = "updated";

    expect(proxy.count$).toBe(10);
    expect(proxy.name$).toBe("updated");
  });

  test("non-$ property access", () => {
    interface TestObj {
      __name: string;
      regularProperty: string;
      name: Delegate<string>;
    }
    const obj: TestObj = {
      __name: "John",
      regularProperty: "direct",
      name: delegate(
        () => obj.__name,
        (val) => void (obj.__name = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    // Regular property access should work normally
    expect(proxy.regularProperty).toBe("direct");
  });

  test("non-$ property set", () => {
    interface TestObj {
      __name: string;
      regularProperty: string;
      name: Delegate<string>;
    }
    const obj: TestObj = {
      __name: "John",
      regularProperty: "direct",
      name: delegate(
        () => obj.__name,
        (val) => void (obj.__name = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    proxy.regularProperty = "modified";
    expect(proxy.regularProperty).toBe("modified");
  });

  test("throws on non-function $ property", () => {
    const obj = {
      name$: "not a function",
    };

    const proxy = createSignalProxy(obj);

    const getter = () => {
      // Accessing name$$ should try to find name$ as a function
      // @ts-expect-error Testing runtime error
      proxy.name$$;
    };
    expect(getter).toThrow(TypeError);
    expect(getter).toThrow("is not a function");
  });

  test("nested object wrapping", () => {
    interface TestObj {
      __data: { id: number; value: string };
      data: Delegate<{ id: number; value: string }>;
    }
    const nestedObj: TestObj = {
      __data: { id: 1, value: "test" },
      data: delegate(
        () => nestedObj.__data,
        (val) => void (nestedObj.__data = val),
      ),
    };

    const proxy = createSignalProxy(nestedObj);

    // Accessing nested object should return a proxy
    const dataProxy = proxy.data$;
    expect(typeof dataProxy).toBe("object");
  });

  test("primitive return values", () => {
    interface TestObj {
      __num: number;
      __str: string;
      __bool: boolean;
      num: Delegate<number>;
      str: Delegate<string>;
      bool: Delegate<boolean>;
    }
    const obj: TestObj = {
      __num: 42,
      __str: "hello",
      __bool: true,
      num: delegate(
        () => obj.__num,
        (val) => void (obj.__num = val),
      ),
      str: delegate(
        () => obj.__str,
        (val) => void (obj.__str = val),
      ),
      bool: delegate(
        () => obj.__bool,
        (val) => void (obj.__bool = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    expect(proxy.num$).toBe(42);
    expect(proxy.str$).toBe("hello");
    expect(proxy.bool$).toBe(true);

    proxy.num$ = 100;
    proxy.str$ = "world";
    proxy.bool$ = false;

    expect(proxy.num$).toBe(100);
    expect(proxy.str$).toBe("world");
    expect(proxy.bool$).toBe(false);
  });

  test("null and undefined values", () => {
    interface TestObj {
      __null: string | null;
      __undefined: string | undefined;
      nullValue: Delegate<string | null>;
      undefinedValue: Delegate<string | undefined>;
    }
    const obj: TestObj = {
      __null: null,
      __undefined: undefined,
      nullValue: delegate(
        () => obj.__null,
        (val) => void (obj.__null = val),
      ),
      undefinedValue: delegate(
        () => obj.__undefined,
        (val) => void (obj.__undefined = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    expect(proxy.nullValue$).toBe(null);
    expect(proxy.undefinedValue$).toBe(undefined);

    proxy.nullValue$ = "not null";
    expect(proxy.nullValue$).toBe("not null");
  });
});

describe("revocableSignalProxy", () => {
  test("basic usage", () => {
    interface TestObj {
      __count: number;
      count: Delegate<number>;
    }
    const obj: TestObj = {
      __count: 0,
      count: delegate(
        () => obj.__count,
        (val) => void (obj.__count = val),
      ),
    };

    const { proxy, revoke } = revocableSignalProxy(obj);

    proxy.count$ = 10;
    expect(proxy.count$).toBe(10);

    revoke();
  });

  test("throws after revoke on get", () => {
    interface TestObj {
      __count: number;
      count: Delegate<number>;
    }
    const obj: TestObj = {
      __count: 0,
      count: delegate(
        () => obj.__count,
        (val) => void (obj.__count = val),
      ),
    };

    const { proxy, revoke } = revocableSignalProxy(obj);

    proxy.count$ = 10;
    expect(proxy.count$).toBe(10);

    revoke();

    expect(() => {
      proxy.count$;
    }).toThrow(TypeError);
  });

  test("throws after revoke on set", () => {
    interface TestObj {
      __count: number;
      count: Delegate<number>;
    }
    const obj: TestObj = {
      __count: 0,
      count: delegate(
        () => obj.__count,
        (val) => void (obj.__count = val),
      ),
    };

    const { proxy, revoke } = revocableSignalProxy(obj);

    proxy.count$ = 10;
    expect(proxy.count$).toBe(10);

    revoke();

    expect(() => {
      proxy.count$ = 20;
    }).toThrow(TypeError);
  });

  test("Symbol.dispose on proxy", () => {
    interface TestObj {
      __value: string;
      value: Delegate<string>;
    }
    const obj: TestObj = {
      __value: "test",
      value: delegate(
        () => obj.__value,
        (val) => void (obj.__value = val),
      ),
    };

    const { proxy } = revocableSignalProxy(obj);

    // Access before dispose
    expect(proxy.value$).toBe("test");

    // The proxy has Symbol.dispose
    const dispose = (proxy as Disposable)[Symbol.dispose];
    expect(typeof dispose).toBe("function");

    // Call dispose
    dispose();

    // Should throw after dispose
    expect(() => {
      proxy.value$;
    }).toThrow(TypeError);
  });

  test("Symbol.asyncDispose on proxy", async () => {
    interface TestObj {
      __value: string;
      value: Delegate<string>;
    }
    const obj: TestObj = {
      __value: "test",
      value: delegate(
        () => obj.__value,
        (val) => void (obj.__value = val),
      ),
    };

    const { proxy } = revocableSignalProxy(obj);

    // Access before dispose
    expect(proxy.value$).toBe("test");

    // The proxy has Symbol.asyncDispose
    const asyncDispose = (proxy as AsyncDisposable)[Symbol.asyncDispose];
    expect(typeof asyncDispose).toBe("function");

    // Call asyncDispose
    await asyncDispose();

    // Should throw after dispose
    expect(() => {
      proxy.value$;
    }).toThrow(TypeError);
  });

  test("using statement pattern", () => {
    interface TestObj {
      __value: string;
      value: Delegate<string>;
    }
    const obj: TestObj = {
      __value: "test",
      value: delegate(
        () => obj.__value,
        (val) => void (obj.__value = val),
      ),
    };

    {
      using proxy = revocableSignalProxy(obj).proxy;
      expect(proxy.value$).toBe("test");
      // Proxy should be revoked at end of scope
    }

    // After scope, proxy should be revoked
    // Note: We can't easily test this outside the scope
  });

  test("caches proxy for same object", () => {
    interface TestObj {
      __value: string;
      value: Delegate<string>;
    }
    const obj: TestObj = {
      __value: "test",
      value: delegate(
        () => obj.__value,
        (val) => void (obj.__value = val),
      ),
    };

    const result1 = revocableSignalProxy(obj);
    const result2 = revocableSignalProxy(obj);

    // Should return the same cached proxy
    expect(result1.proxy).toBe(result2.proxy);
  });
});

describe("createSignalProxy.revocable", () => {
  test("exposes revocableSignalProxy", () => {
    expect(createSignalProxy.revocable).toBe(revocableSignalProxy);
  });

  test("can create revocable proxy via property", () => {
    interface TestObj {
      __count: number;
      count: Delegate<number>;
    }
    const obj: TestObj = {
      __count: 0,
      count: delegate(
        () => obj.__count,
        (val) => void (obj.__count = val),
      ),
    };

    const { proxy, revoke } = createSignalProxy.revocable(obj);

    proxy.count$ = 10;
    expect(proxy.count$).toBe(10);

    revoke();

    expect(() => {
      proxy.count$;
    }).toThrow(TypeError);
  });
});

describe("edge cases", () => {
  test("symbol properties are ignored", () => {
    const sym = Symbol("test");
    interface TestObj {
      __value: string;
      [sym]: string;
      value: Delegate<string>;
    }
    const obj: TestObj = {
      __value: "test",
      [sym]: "symbol value",
      value: delegate(
        () => obj.__value,
        (val) => void (obj.__value = val),
      ),
    };

    const proxy = createSignalProxy(obj);

    // Symbol properties should not be proxied with $
    expect(proxy.value$).toBe("test");
  });

  test("empty object", () => {
    const obj = {};
    const proxy = createSignalProxy(obj);

    // Should not throw
    expect(typeof proxy).toBe("object");
  });

  test("object with only regular properties", () => {
    const obj = {
      name: "John",
      age: 30,
    };

    const proxy = createSignalProxy(obj);

    expect(proxy.name).toBe("John");
    expect(proxy.age).toBe(30);
  });

  test("setter with multiple parameters", () => {
    interface TestObj {
      __values: number[];
      add: Delegate<number[]>;
    }
    const obj: TestObj = {
      __values: [],
      add: delegate(
        () => obj.__values,
        (vals) => obj.__values.push(...vals),
      ),
    };

    const proxy = createSignalProxy(obj);

    // Setter with multiple parameters
    proxy.add$ = [1, 2, 3];
    // `proxy.add$` is a proxy-wrapped array; Bun's `toStrictEqual` rejects proxies, so compare structurally.
    expect(proxy.add$).toEqual([1, 2, 3]);
  });

  test("getter only (no setter)", () => {
    let counter = 0;
    const obj = {
      counter: () => ++counter,
    };

    const proxy = createSignalProxy(obj);

    // Each access should call the getter
    expect(proxy.counter$).toBe(1);
    expect(proxy.counter$).toBe(2);
    expect(proxy.counter$).toBe(3);
  });

  test("setter only pattern", () => {
    const logs: string[] = [];
    const obj = {
      log: (_message: string) => {
        logs.push(_message);
      },
    };

    const proxy = createSignalProxy(obj);

    proxy.log$ = "test message";
    expect(logs).toStrictEqual(["test message"]);
  });
});
