---
name: jsr-documentation
description: >
  This skill provides step-by-step instructions for generating JSDoc comments 
  that comply with the JSR documentation standard. It guides the agent to 
  annotate exported symbols, add module documentation, use correct tags, 
  and meet JSR's quality requirements.
---

# Skill: JSR 标准注释文档生成

## 技能描述

此技能用于指导 Agent 以符合 **JSR（JavaScript Registry）** 文档生成标准的方式，
为 TypeScript/JavaScript 项目中的导出符号（函数、类、接口、类型别名、常量等）
和模块文件自动填充 JSDoc 注释文档。

## 适用场景

- 为新项目或已有项目添加/补全符合 JSR 标准的 JSDoc 注释。
- 确保项目通过 JSR 的文档检查（如 `deno doc --lint`）。
- 提升包在 JSR 上的文档评分（目标：覆盖 80% 以上的导出符号）。
- 确保编译代码中的 JSDoc 注释能够在 JSR 包页面、编辑器工具提示和自动补全中正确显示。

## 核心目标

1. **符号级文档**：为每一个导出的函数、类、接口、类型别名、常量等添加 JSDoc 注释。
2. **模块级文档**：为每一个导出的模块文件添加带有 `@module` 标签的模块文档。
3. **标签规范性**：使用 Deno/JSR 支持的 JSDoc 标签，严格按照标签顺序规范编写。
4. **质量要求**：第一段为简洁摘要，支持 Markdown 格式，参数和返回值有明确类型和描述。

---

## 执行规范

### 1. 总体原则

- JSDoc 注释必须写在对应符号/模块的正上方（紧邻符号声明之前），格式为 `/** ... */`。
- 多行注释每行以 `*` 开头，前面缩进一个空格。
- 第一段（summary）必须是最简洁明了的功能描述，是用户最先看到的内容。
- 后续段落可用于补充实现细节、注意事项、边界情况等。
- JSDoc 描述区域支持 Markdown 格式。
- 所有 JSDoc 标签（@xxx）必须放在注释整体的最后面。
- 拒绝废话型描述，例如“此函数接收一个字符串并返回一个字符串”——应直接描述该符号是做什么的。
- 对于 TypeScript 项目，无需在 JSDoc 中重复 TypeScript 已明确标注的类型信息（如 `@param {number} x` 可省略 `{number}`），除非是用 JS 文件且需要类型推演。

### 2. 必须覆盖的导出符号列表

| 符号类别               | 是否必须 | 注释位置                                             |
| ---------------------- | -------- | ---------------------------------------------------- |
| `export function`      | ✓ 必须   | 函数声明正上方                                       |
| `export class`         | ✓ 必须   | class 声明正上方                                     |
| `export interface`     | ✓ 必须   | interface 声明正上方                                 |
| `export type`          | ✓ 必须   | type 别名正上方                                      |
| `export const`         | ✓ 必须   | const 声明正上方                                     |
| `export enum`          | ✓ 必须   | enum 声明正上方                                      |
| 接口/类的公开属性/方法 | ✓ 推荐   | 对应属性/方法声明正上方                              |
| 构造函数               | ✓ 推荐   | constructor 正上方，标注 `@param`                    |
| 非导出（内部）函数     | 可选     | 若不需对外展示，可添加 `@ignore` 或 `@internal` 标签 |

目标：**至少 80% 以上的公开导出符号需有文档注释**，才能获得 JSR 文档评分满分。

### 3. 符号级文档的写法

#### 3.1 普通函数

必须包含：

- **摘要描述**（第一段）：简洁说明函数功能。
- **`@param` 标签**：每个参数逐一说明，对可选参数需指明默认值。
- **`@returns` 标签**：明确说明返回值。
- **（推荐）`@example` 标签**：演示该函数的基本调用方式，必要时给出典型输入和预期输出。

#### 3.2 包含多个参数的函数

必须为每一个参数提供 `@param` 说明，对于带有默认值的参数应同时说明默认值。

#### 3.3 接口（interface）

必须包含：

- 接口自身的描述。
- 每个属性的 `/** ... */` 注释（直接写在属性上方）。
- 对于可选属性，必须说明默认行为。

#### 3.4 类（class）

必须包含：

- 类的描述。
- 构造函数的 `@param`。
- 所有公开属性和方法的注释。

#### 3.5 类型别名和常量

```typescript
/** A unique identifier for a user. */
export type UserId = string;

/** The default page size for paginated queries. */
export const DEFAULT_PAGE_SIZE = 50;
```

### 4. 模块级文档的写法

模块文档必须写在模块文件的 **最顶部**，包含：

1. 模块描述：简述该模块的用途和包含的主要导出内容。
2. `@module` 标签：**必须写在 JSDoc 注释的最后一行**。
3. （推荐）`@example` 标签：展示如何导入和使用该模块。

### 5. 支持的 JSDoc 标签（Deno/JSR 兼容）

| 标签                                 | 用途                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| `@param {type} name - description`   | 描述函数参数                                                   |
| `@returns {type} description`        | 描述返回值（TypeScript 中可省略 `{type}`）                     |
| `@throws {type} description`         | 描述可能抛出的异常                                             |
| `@example`                           | 提供代码示例                                                   |
| `@module [name]`                     | 标记模块文档（必须放在最后）                                   |
| `@type {type}`                       | 描述类型                                                       |
| `@typedef`                           | 定义自定义类型                                                 |
| `@property` / `@prop`                | 描述对象的属性                                                 |
| `@template`                          | 描述泛型参数                                                   |
| `@link` / `@linkcode` / `@linkplain` | 链接到其他符号                                                 |
| `@deprecated`                        | 标记已弃用的 API                                               |
| `@since version`                     | 标记引入的版本                                                 |
| `@see`                               | 引用相关资源                                                   |
| `@ignore`                            | 从文档中排除该符号                                             |
| `@internal`                          | 标记为内部符号，仍在文档中但标注为内部                         |
| `@constructor` / `@class`            | 标记函数为构造函数                                             |
| `@category`                          | 对符号进行分类（优先使用此标准标签，避免 `@group` 等非标标签） |

**禁止使用的非标准标签**：`@group` 等非标准标签可能导致 JSR 文档生成器解析失败。

- `@group`
- `@typeParam`
- 其他非标准标签

### 6. 质量标准检查清单

在执行过程中，Agent 必须逐项检查：

- [ ] 每个导出符号上方是否都有 JSDoc 注释（格式正确：`/** ... */`）。
- [ ] 第一段是否为简洁明确的功能摘要（避免冗长的实现细节描述）。
- [ ] 函数的每个参数是否都有 `@param` 标签，返回值是否有 `@returns`。
- [ ] 可选/有默认值的参数是否明确说明了默认行为。
- [ ] 接口/类的公开属性和方法是否都有注释。
- [ ] 每个导出模块顶部是否有带 `@module` 标签的模块文档（`@module` 在最后一行）。
- [ ] 是否使用标准 JSDoc 标签，未出现 `@group` 等非标准标签。
- [ ] 复杂符号是否提供了 `@example` 示例。
- [ ] 是否使用 `{@link}` 在相关符号之间建立交叉引用。
- [ ] Markdown 格式是否正确（代码块、标题、列表等）。
- [ ] 是否避免了“慢类型”（Slow Types）——即避免从代码中推断出的过于复杂的类型，确保 JSR 能正常生成文档和类型声明。
- [ ] 推荐运行 `deno doc --lint` 验证文档无错误。

### 7. 常见的错误模式及规避方法

| 错误模式                      | 原因                         | 解决方案                                     |
| ----------------------------- | ---------------------------- | -------------------------------------------- |
| 模块文档完全无法显示          | `@module` 未放在最后一行     | 确保 `@module` 是 JSDoc 注释中的最后一个标签 |
| 部分文档只显示示例代码        | 标签顺序错误                 | 所有标签放在描述内容之后                     |
| 文档解析失败                  | 使用了 `@group` 等非标准标签 | 使用 `@category` 替代                        |
| 过于冗长的第一段              | 将实现细节放入 summary       | 第一段仅写功能摘要，细节放后续段落           |
| TypeScript 代码中重复标注类型 | 类型已在 TS 声明中体现       | TS 项目仅需写参数名和描述，无需 `{type}`     |

---

## 输出格式

Agent 在完成任务后，应输出以下内容：

1. **修改的文件列表**：列出所有被添加/修改 JSDoc 注释的文件及其路径。
2. **覆盖统计**：被注释的符号数量、模块文档数量、总导出符号覆盖率。
3. **（如适用）lint 结果**：若运行了 `deno doc --lint` 的结果摘要。
4. **后续建议**：指出仍有缺失的文档，以及其他可优化的细节（如 README 与模块文档的关系）。

## 注意事项

- **README 与模块文档的关系**：若默认入口点的模块文档带有 `@module` 标签，JSR 会在“Overview”标签页显示该模块文档而非 README。可在包设置中将 Readme Source 设为 “Readme” 来始终显示 README。
- **`@module` 标签必须放在 JSDoc 注释的最后一行**：JSR 文档生成器会将该标签之后的所有内容视为模块定义的一部分，标签位置不正确会导致文档内容被错误解析或完全丢失。
- **非导出类型的引用**：若公开 API 中引用了未导出的类型，deno doc lint 会报错，需导出该类型或标记 `@internal`。
- **慢类型问题**：复杂的类型推断可能导致 JSR 无法生成文档或类型声明，应显式标注类型而非依赖复杂推断。

## 参考资料

- [JSR Writing Documentation](https://jsr.io/docs/writing-docs)
- [Deno Supported JSDoc Tags](https://docs.deno.com/runtime/reference/cli/doc/#supported-jsdoc-tags)
- [How to Document Your JavaScript Package](https://deno.com/blog/document-javascript-package)
