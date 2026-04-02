import { signalization } from "@chrock-studio/signals/decorators";
import { effectScope } from "alien-signals";
import { assertEquals } from "@std/assert";

Deno.test("signalization", async (t) => {
  await t.step("Basic getter/setter", () => {
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
      assertEquals(temp.name, "John Doe");
      assertEquals(temp.count, 1);
      temp.first = "Jane";
      assertEquals(temp.count, 1);
      assertEquals(temp.name, "Jane Doe");
      assertEquals(temp.count, 2);
      temp.name, temp.name, temp.name;
      assertEquals(temp.count, 2);
    });
    stop();
  });
});
