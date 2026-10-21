import { signalization } from "@chrock-studio/signals/decorators";
import { effectScope } from "alien-signals";
import { describe, expect, test } from "bun:test";

describe("signalization", () => {
  test("Basic getter/setter", () => {
    class Temp {
      count = 0;

      @signalization
      accessor first = "John";
      @signalization
      accessor last = "Doe";
      @signalization
      get name() {
        this.count++;
        return `${this.first} ${this.last}`;
      }
    }

    const temp = new Temp();
    const stop = effectScope(() => {
      expect(temp.name).toBe("John Doe");
      expect(temp.count).toBe(1);
      temp.first = "Jane";
      expect(temp.count).toBe(1);
      expect(temp.name).toBe("Jane Doe");
      expect(temp.count).toBe(2);
      (temp.name, temp.name, temp.name);
      expect(temp.count).toBe(2);
    });
    stop();
  });
});
