import { describe, expect, it } from "vitest";
import { signalization } from "./decorators";
import { signal, effect, computed } from "alien-signals";

describe("signalization", () => {
  describe("getter (readonly)", () => {
    it("should create a computed signal from getter", () => {
      class Example {
        name = signal("World");

        @signalization
        get greeting() {
          return `Hello, ${this.name()}!`;
        }
      }

      const instance = new Example();
      expect(instance.greeting).toBe("Hello, World!");
    });

    it("should update when dependency changes", () => {
      class Example {
        name = signal("World");

        @signalization
        get greeting() {
          return `Hello, ${this.name()}!`;
        }
      }

      const instance = new Example();
      expect(instance.greeting).toBe("Hello, World!");

      instance.name("Signals");
      expect(instance.greeting).toBe("Hello, Signals!");
    });

    it("should work with multiple dependencies", () => {
      class Example {
        first = signal("John");
        last = signal("Doe");

        @signalization
        get fullName() {
          return `${this.first()} ${this.last()}`;
        }
      }

      const instance = new Example();
      expect(instance.fullName).toBe("John Doe");

      instance.first("Jane");
      expect(instance.fullName).toBe("Jane Doe");

      instance.last("Smith");
      expect(instance.fullName).toBe("Jane Smith");
    });

    it("should work with computed values", () => {
      class Example {
        count = signal(1);

        @signalization
        get doubled() {
          return this.count() * 2;
        }
      }

      const instance = new Example();
      expect(instance.doubled).toBe(2);

      instance.count(5);
      expect(instance.doubled).toBe(10);
    });

    it("should work with complex expressions", () => {
      class Example {
        items = signal([1, 2, 3]);

        @signalization
        get sum() {
          return this.items().reduce((a, b) => a + b, 0);
        }
      }

      const instance = new Example();
      expect(instance.sum).toBe(6);

      instance.items([1, 2, 3, 4, 5]);
      expect(instance.sum).toBe(15);
    });
  });

  describe("accessor (writable)", () => {
    it("should create a writable signal from accessor", () => {
      class Counter {
        @signalization
        accessor count = 0;
      }

      const instance = new Counter();
      expect(instance.count).toBe(0);

      instance.count = 5;
      expect(instance.count).toBe(5);
    });

    it("should trigger reactive updates", () => {
      class Counter {
        @signalization
        accessor count = 0;

        @signalization
        get doubled() {
          return this.count * 2;
        }
      }

      const instance = new Counter();
      expect(instance.doubled).toBe(0);

      instance.count = 5;
      expect(instance.doubled).toBe(10);

      instance.count = 10;
      expect(instance.doubled).toBe(20);
    });

    it("should work with string values", () => {
      class Example {
        @signalization
        accessor message = "Hello";
      }

      const instance = new Example();
      expect(instance.message).toBe("Hello");

      instance.message = "World";
      expect(instance.message).toBe("World");
    });

    it("should work with object values", () => {
      interface State {
        enabled: boolean;
        value: number;
      }

      class Example {
        @signalization
        accessor state: State = { enabled: true, value: 0 };
      }

      const instance = new Example();
      expect(instance.state.enabled).toBe(true);
      expect(instance.state.value).toBe(0);

      instance.state = { enabled: false, value: 42 };
      expect(instance.state.enabled).toBe(false);
      expect(instance.state.value).toBe(42);
    });

    it("should work with nullable values", () => {
      class Example {
        @signalization
        accessor value: string | null = null;
      }

      const instance = new Example();
      expect(instance.value).toBeNull();

      instance.value = "test";
      expect(instance.value).toBe("test");

      instance.value = null;
      expect(instance.value).toBeNull();
    });
  });

  describe("multiple instances", () => {
    it("should maintain separate state for each instance", () => {
      class Counter {
        @signalization
        accessor count = 0;

        @signalization
        get doubled() {
          return this.count * 2;
        }
      }

      const a = new Counter();
      const b = new Counter();

      a.count = 10;
      b.count = 20;

      expect(a.count).toBe(10);
      expect(b.count).toBe(20);
      expect(a.doubled).toBe(20);
      expect(b.doubled).toBe(40);
    });

    it("should maintain separate computed values for each instance", () => {
      class Example {
        prefix: string;

        constructor(prefix: string) {
          this.prefix = prefix;
        }

        @signalization
        get message() {
          return `${this.prefix}: Hello`;
        }
      }

      const a = new Example("A");
      const b = new Example("B");

      expect(a.message).toBe("A: Hello");
      expect(b.message).toBe("B: Hello");
    });
  });

  describe("type compatibility", () => {
    it("should work with boolean values", () => {
      class Example {
        @signalization
        accessor enabled = false;
      }

      const instance = new Example();
      expect(instance.enabled).toBe(false);

      instance.enabled = true;
      expect(instance.enabled).toBe(true);
    });

    it("should work with number values", () => {
      class Example {
        @signalization
        accessor value = 42;
      }

      const instance = new Example();
      expect(instance.value).toBe(42);

      instance.value = 100;
      expect(instance.value).toBe(100);
    });

    it("should work with array values", () => {
      class Example {
        @signalization
        accessor items: number[] = [1, 2, 3];
      }

      const instance = new Example();
      expect(instance.items).toEqual([1, 2, 3]);

      instance.items = [4, 5, 6];
      expect(instance.items).toEqual([4, 5, 6]);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined initial values", () => {
      class Example {
        @signalization
        accessor value: string | undefined = undefined;
      }

      const instance = new Example();
      expect(instance.value).toBeUndefined();

      instance.value = "test";
      expect(instance.value).toBe("test");
    });

    it("should handle empty string values", () => {
      class Example {
        @signalization
        accessor text = "";
      }

      const instance = new Example();
      expect(instance.text).toBe("");

      instance.text = "hello";
      expect(instance.text).toBe("hello");

      instance.text = "";
      expect(instance.text).toBe("");
    });

    it("should handle zero values", () => {
      class Example {
        @signalization
        accessor count = 0;
      }

      const instance = new Example();
      expect(instance.count).toBe(0);

      instance.count = 5;
      expect(instance.count).toBe(5);

      instance.count = 0;
      expect(instance.count).toBe(0);
    });

    describe("effect integration", () => {
      it("should track effect dependencies", () => {
        class Example {
          @signalization accessor count = 0;
        }

        const instance = new Example();
        const effects: number[] = [];

        const dispose = effect(() => {
          effects.push(instance.count * 2);
        });

        expect(effects).toEqual([0]);
        instance.count = 5;
        expect(effects).toEqual([0, 10]);
        instance.count = 10;
        expect(effects).toEqual([0, 10, 20]);

        dispose();
      });

      it("should track multiple effect dependencies", () => {
        class Example {
          @signalization accessor first = "";
          @signalization accessor last = "";
        }

        const instance = new Example();
        const effects: string[] = [];

        const dispose = effect(() => {
          effects.push(`${instance.first} ${instance.last}`);
        });

        expect(effects).toEqual([" "]);
        instance.first = "John";
        expect(effects).toEqual([" ", "John "]);
        instance.last = "Doe";
        expect(effects).toEqual([" ", "John ", "John Doe"]);

        dispose();
      });

      it("should work with computed signals in effects", () => {
        class Example {
          @signalization accessor count = 1;
          @signalization get doubled() {
            return this.count * 2;
          }
        }

        const instance = new Example();
        const effects: number[] = [];

        const dispose = effect(() => {
          effects.push(instance.doubled);
        });

        expect(effects).toEqual([2]);
        instance.count = 5;
        expect(effects).toEqual([2, 10]);
        instance.count = 10;
        expect(effects).toEqual([2, 10, 20]);

        dispose();
      });

      it("should work with computed from alien-signals", () => {
        class Example {
          count = signal(1);
          doubled = computed(() => this.count() * 2);
        }

        const instance = new Example();
        const effects: number[] = [];

        const dispose = effect(() => {
          effects.push(instance.doubled());
        });

        expect(effects).toEqual([2]);
        instance.count(5);
        expect(effects).toEqual([2, 10]);
        instance.count(10);
        expect(effects).toEqual([2, 10, 20]);

        dispose();
      });

      it("should handle effect with getter decorators", () => {
        class Example {
          name = signal("World");
          @signalization get greeting() {
            return `Hello, ${this.name()}!`;
          }
        }

        const instance = new Example();
        const effects: string[] = [];

        const dispose = effect(() => {
          effects.push(instance.greeting);
        });

        expect(effects).toEqual(["Hello, World!"]);
        instance.name("Signals");
        expect(effects).toEqual(["Hello, World!", "Hello, Signals!"]);

        dispose();
      });
    });
  });
});
