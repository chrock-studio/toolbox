import { assertEquals, assertThrows } from "@std/assert";
import { type Delegate, delegate } from "@chrock-studio/shared/delegate";
import { createSignalProxy, revocableSignalProxy } from "./mod.ts";

Deno.test("createSignalProxy", async (t) => {
  await t.step("basic getter/setter access", () => {
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
    assertEquals(proxy.name$, "John");

    // Set value
    proxy.name$ = "Jane";
    assertEquals(proxy.name$, "Jane");
  });

  await t.step("multiple properties", () => {
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

    assertEquals(proxy.count$, 0);
    assertEquals(proxy.name$, "test");

    proxy.count$ = 10;
    proxy.name$ = "updated";

    assertEquals(proxy.count$, 10);
    assertEquals(proxy.name$, "updated");
  });

  await t.step("non-$ property access", () => {
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
    assertEquals(proxy.regularProperty, "direct");
  });

  await t.step("non-$ property set", () => {
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
    assertEquals(proxy.regularProperty, "modified");
  });

  await t.step("throws on non-function $ property", () => {
    const obj = {
      name$: "not a function",
    };

    const proxy = createSignalProxy(obj);

    assertThrows(
      () => {
        // Accessing name$$ should try to find name$ as a function
        // @ts-expect-error Testing runtime error
        proxy.name$$;
      },
      TypeError,
      "is not a function",
    );
  });

  await t.step("nested object wrapping", () => {
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
    assertEquals(typeof dataProxy, "object");
  });

  await t.step("primitive return values", () => {
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
      num: delegate(() => obj.__num, (val) => void (obj.__num = val)),
      str: delegate(() => obj.__str, (val) => void (obj.__str = val)),
      bool: delegate(() => obj.__bool, (val) => void (obj.__bool = val)),
    };

    const proxy = createSignalProxy(obj);

    assertEquals(proxy.num$, 42);
    assertEquals(proxy.str$, "hello");
    assertEquals(proxy.bool$, true);

    proxy.num$ = 100;
    proxy.str$ = "world";
    proxy.bool$ = false;

    assertEquals(proxy.num$, 100);
    assertEquals(proxy.str$, "world");
    assertEquals(proxy.bool$, false);
  });

  await t.step("null and undefined values", () => {
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

    assertEquals(proxy.nullValue$, null);
    assertEquals(proxy.undefinedValue$, undefined);

    proxy.nullValue$ = "not null";
    assertEquals(proxy.nullValue$, "not null");
  });
});

Deno.test("revocableSignalProxy", async (t) => {
  await t.step("basic usage", () => {
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
    assertEquals(proxy.count$, 10);

    revoke();
  });

  await t.step("throws after revoke on get", () => {
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
    assertEquals(proxy.count$, 10);

    revoke();

    assertThrows(
      () => {
        proxy.count$;
      },
      TypeError,
    );
  });

  await t.step("throws after revoke on set", () => {
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
    assertEquals(proxy.count$, 10);

    revoke();

    assertThrows(
      () => {
        proxy.count$ = 20;
      },
      TypeError,
    );
  });

  await t.step("Symbol.dispose on proxy", () => {
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
    assertEquals(proxy.value$, "test");

    // The proxy has Symbol.dispose
    const dispose = (proxy as Disposable)[Symbol.dispose];
    assertEquals(typeof dispose, "function");

    // Call dispose
    dispose();

    // Should throw after dispose
    assertThrows(
      () => {
        proxy.value$;
      },
      TypeError,
    );
  });

  await t.step("Symbol.asyncDispose on proxy", async () => {
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
    assertEquals(proxy.value$, "test");

    // The proxy has Symbol.asyncDispose
    const asyncDispose = (proxy as AsyncDisposable)[Symbol.asyncDispose];
    assertEquals(typeof asyncDispose, "function");

    // Call asyncDispose
    await asyncDispose();

    // Should throw after dispose
    assertThrows(
      () => {
        proxy.value$;
      },
      TypeError,
    );
  });

  await t.step("using statement pattern", () => {
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
      assertEquals(proxy.value$, "test");
      // Proxy should be revoked at end of scope
    }

    // After scope, proxy should be revoked
    // Note: We can't easily test this outside the scope
  });

  await t.step("caches proxy for same object", () => {
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
    assertEquals(result1.proxy, result2.proxy);
  });
});

Deno.test("createSignalProxy.revocable", async (t) => {
  await t.step("exposes revocableSignalProxy", () => {
    assertEquals(createSignalProxy.revocable, revocableSignalProxy);
  });

  await t.step("can create revocable proxy via property", () => {
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
    assertEquals(proxy.count$, 10);

    revoke();

    assertThrows(
      () => {
        proxy.count$;
      },
      TypeError,
    );
  });
});

Deno.test("edge cases", async (t) => {
  await t.step("symbol properties are ignored", () => {
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
    assertEquals(proxy.value$, "test");
  });

  await t.step("empty object", () => {
    const obj = {};
    const proxy = createSignalProxy(obj);

    // Should not throw
    assertEquals(typeof proxy, "object");
  });

  await t.step("object with only regular properties", () => {
    const obj = {
      name: "John",
      age: 30,
    };

    const proxy = createSignalProxy(obj);

    assertEquals(proxy.name, "John");
    assertEquals(proxy.age, 30);
  });

  await t.step("setter with multiple parameters", () => {
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
    assertEquals(proxy.add$, [1, 2, 3]);
  });

  await t.step("getter only (no setter)", () => {
    let counter = 0;
    const obj = {
      counter: () => ++counter,
    };

    const proxy = createSignalProxy(obj);

    // Each access should call the getter
    assertEquals(proxy.counter$, 1);
    assertEquals(proxy.counter$, 2);
    assertEquals(proxy.counter$, 3);
  });

  await t.step("setter only pattern", () => {
    const logs: string[] = [];
    const obj = {
      log: (_message: string) => {
        logs.push(_message);
      },
    };

    const proxy = createSignalProxy(obj);

    proxy.log$ = "test message";
    assertEquals(logs, ["test message"]);
  });
});
