# Design for `@chrock-studio/nania`

## A nania-component

```tsx
@Nania.customElement("my-banner")
class Banner extends Nania.Element {
  static get attributes() {
    return {
      title: z.string(),
      description: z.string(),
      color: z.string().optional(),
    }; // <- { title: string, description: string, color?: string }
  }

  setup() {
    return (
      <div class="relative h-[1.5em]">
        <div class="absolute top-1/2 left-0 -translate-y-1/2">{this.attrs.description}</div>
      </div>
    );
  }
}
```
