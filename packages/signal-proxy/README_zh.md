# `@chrock-studio/signal-proxy`

一个基于 Proxy 实现的信号代理工具库，通过 `$` 后缀语法将对象中的函数属性转换为响应式的 getter 和 setter 属性。

## 📦 安装

```bash
# 使用 pnpm
pnpm add @chrock-studio/signal-proxy

# 使用 npm
npm install @chrock-studio/signal-proxy

# 使用 yarn
yarn add @chrock-studio/signal-proxy
```

## 🚀 快速开始

```typescript
import { createSignalProxy, revocableSignalProxy } from "@chrock-studio/signal-proxy";

const obj = {
  __name: "John",
  /**
   * 组合函数：
   * - Getter（无参数函数）- 使用 name$ 访问
   * - Setter（带参数函数）- 使用 name$ 赋值
   */
  name(...args: [val: string] | []) {
    if (args.length) {
      this.__name = args[0];
    } else {
      return this.__name;
    }
  },

  // 普通属性
  age: 25,
};

const proxied = createSignalProxy(obj);

// 访问 getter - 自动调用函数
console.log(proxied.name$); // "John"

// 调用 setter - 自动传入值
proxied.name$ = "Jane";

// 普通属性访问
console.log(proxied.age); // 25
```

## 📖 API 文档

### `createSignalProxy<T>(obj: T): SignalProxy<T>`

创建一个动态代理对象，将对象的函数属性转换为信号式的属性访问。

#### 参数

| 参数  | 类型 | 描述             |
| ----- | ---- | ---------------- |
| `obj` | `T`  | 要代理的原始对象 |

#### 返回值

返回一个 `SignalProxy<T>` 类型的代理对象，具有：

- 原始对象的所有属性
- 以 `$` 结尾的 getter 属性（只读，用于无参数函数）
- 以 `$` 结尾的 setter 属性（可写，用于带参数函数）

#### 示例

```typescript
import { createSignalProxy } from "@chrock-studio/signal-proxy";

const obj = {
  __name: "John",
  name(...args: [val: string] | []) {
    if (args.length) {
      // 带参数函数 - setter
      this.__name = args[0];
    } else {
      // 无参数函数 - getter
      return this.__name;
    }
  },
};

const proxied = createSignalProxy(obj);

// 访问 getter
console.log(proxied.name$); // "John"

// 调用 setter
proxied.name$ = "Jane";
console.log(proxied.name$); // "Jane"
```

### `revocableSignalProxy<T>(obj: T): { proxy: SignalProxy<T>; revoke(): void }`

创建一个可撤销的代理对象，功能与 `createSignalProxy` 相同，但返回一个包含代理对象和撤销函数的对象。

#### 参数

| 参数  | 类型 | 描述             |
| ----- | ---- | ---------------- |
| `obj` | `T`  | 要代理的原始对象 |

#### 返回值

返回一个包含以下属性的对象：

| 属性       | 类型             | 描述                               |
| ---------- | ---------------- | ---------------------------------- |
| `proxy`    | `SignalProxy<T>` | 信号代理对象                       |
| `revoke()` | `() => void`     | 撤销代理的函数，调用后代理将不可用 |

#### 使用场景

- 需要在组件卸载时清理代理
- 需要手动控制代理生命周期
- 需要避免内存泄漏的场景

#### 示例

```typescript
import { revocableSignalProxy } from "@chrock-studio/signal-proxy";

const obj = {
  __name: "John",
  name(...args: [val: string] | []) {
    if (args.length) {
      this.__name = args[0];
    } else {
      return this.__name;
    }
  },
};

// 获取可撤销的代理
const { proxy, revoke } = revocableSignalProxy(obj);

// 访问 getter
console.log(proxy.name$); // "John"

// 调用 setter
proxy.name$ = "Jane";
console.log(proxy.name$); // "Jane"

// 当不再需要时，调用 revoke 撤销代理
// 撤销后，proxy 对象将无法再使用
revoke();
```

#### 组件生命周期示例

```typescript
import { revocableSignalProxy } from "@chrock-studio/signal-proxy";

class MyComponent {
  private state: any;
  private revokeProxy: (() => void) | null = null;

  constructor() {
    const { proxy, revoke } = revocableSignalProxy({
      __count: 0,
      count(...args: [val: number] | []) {
        if (args.length) {
          this.__count = args[0];
        } else {
          return this.__count;
        }
      },
    });
    this.state = proxy;
    this.revokeProxy = revoke;
  }

  getCount(): number {
    return this.state.count$;
  }

  setCount(value: number): void {
    this.state.count$ = value;
  }

  // 组件销毁时清理代理
  destroy(): void {
    this.revokeProxy?.();
    this.revokeProxy = null;
  }
}
```

### 类型定义

#### `MatchFunction<O, K>`

提取对象中的函数属性键。如果属性类型是函数则返回键名，否则返回 `never`。

#### `MatchGetter<O, K>`

提取 getter 函数键 - 无参数的函数（参数长度为 0）。

#### `MatchSetter<O, K>`

提取 setter 函数键 - 带一个或多个参数的函数。

#### `SignalProxySetters<T, K>`

为 setter 属性创建带 `$` 后缀的映射类型，每个 setter 属性接受函数的参数类型。

#### `SignalProxyGetters<T, K>`

为 getter 属性创建带 `$` 后缀的只读映射类型，返回类型为函数的返回值类型。

#### `SignalProxy<T>`

完整的 SignalProxy 类型，组合了：

- 原始属性
- 带 `$` 后缀的 setter 属性（用于带参数函数）
- 带 `$` 后缀的 getter 属性（只读，用于无参数函数）

## 💡 使用示例

### 基本用法

```typescript
import { createSignalProxy } from "@chrock-studio/signal-proxy";

const state = {
  __count: 0,
  __name: "Alice",

  count(...args: [val: number] | []) {
    if (args.length) {
      this.__count = args[0];
    } else {
      return this.__count;
    }
  },

  name(...args: [val: string] | []) {
    if (args.length) {
      this.__name = args[0];
    } else {
      return this.__name;
    }
  },
};

const proxied = createSignalProxy(state);

// 读取 getter
console.log(proxied.count$); // 0
console.log(proxied.name$); // "Alice"

// 写入 setter
proxied.count$ = 42;
proxied.name$ = "Bob";

console.log(proxied.count$); // 42
console.log(proxied.name$); // "Bob"
```

### Getter/Setter 模式

对于同时需要 getter 和 setter 的场景，可以使用可选参数模式：

```typescript
import { createSignalProxy } from "@chrock-studio/signal-proxy";

const state = {
  __value: 0,
  // 使用可选参数同时支持 getter 和 setter
  value(val?: number) {
    if (val !== undefined) {
      this.__value = val;
    }
    return this.__value;
  },
};

const proxied = createSignalProxy(state);

// 由于 value 接受参数，它被视为 setter
// 调用时传入参数
proxied.value$(10);
console.log(proxied.value$); // 10
```

### 嵌套对象代理

```typescript
import { createSignalProxy } from "@chrock-studio/signal-proxy";

const user = {
  getName: () => "Alice",
  getProfile: () => ({
    age: 25,
    city: "Beijing",
  }),
};

const proxied = createSignalProxy(user);

// 嵌套对象也会被代理
console.log(proxied.getName$); // "Alice"
const profile = proxied.getProfile$;
console.log(profile); // { age: 25, city: "Beijing" }
```

### 响应式状态管理

```typescript
import { createSignalProxy } from "@chrock-studio/signal-proxy";

let _count = 0;

const state = createSignalProxy({
  count(...args: [val: number] | []) {
    if (args.length) {
      _count = args[0];
    } else {
      return _count;
    }
  },
  // 计算属性
  double() {
    return _count * 2;
  },
});

// 访问 getter
console.log(state.count$); // 0
console.log(state.double$); // 0

// 调用 setter
state.count$ = 5; // Count updated to: 5

// 计算属性自动更新
console.log(state.double$); // 10
```

## 🎯 特性

- ✅ **类型安全**：完整的 TypeScript 类型支持
- ✅ **零依赖**：轻量级，无第三方依赖
- ✅ **自动调用 getter**：使用 `$` 后缀自动调用无参数函数
- ✅ **自动调用 setter**：使用 `$` 后缀赋值自动调用带参数函数
- ✅ **嵌套代理**：对象返回值自动代理
- ✅ **错误处理**：对非函数属性使用 `$` 访问时抛出清晰的错误

## 📜 许可证

MIT License

## 👤 作者

**JuerGenie**

- Email: juergenie@outlook.com
- GitHub: [@JuerGenie](https://github.com/JuerGenie)

## 🏠 主页

[https://github.com/chrock-studio/toolbox/tree/main/packages/signal-proxy](https://github.com/chrock-studio/toolbox/tree/main/packages/signal-proxy)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](https://github.com/chrock-studio/toolbox/blob/main/CONTRIBUTING.md)。
