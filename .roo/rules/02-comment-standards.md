## Agent Custom Instructions: Guidelines for Writing Documentation Comments

### 1. Core Principles

- **Comments as documentation**: Every publicly exported symbol (module, function, class, interface, type alias,
  constant, etc.) MUST have a documentation comment.
- **Format standard**: Use JSDoc / TSDoc style comments (`/** ... */`) with Markdown support.
- **Audience‑oriented**: Describe _what_ the symbol does, not _how_ it is implemented. Avoid implementation details.

### 2. Module Documentation (File‑level)

- Every source file must have a module documentation comment at the top.
- Use the `@module` tag to label the module name (typically matching the file’s purpose).
- The content should explain:
  - The core functionality or responsibility of the module
  - A brief overview of its main exports
  - Typical usage scenarios (if necessary)

**Example**:

```typescript
/**
 * Provides user authentication related utility functions.
 *
 * @module auth
 *
 * This module includes:
 * - `login()`: username/password login
 * - `logout()`: clear session
 * - `validateToken()`: validate JWT
 */
```

### 3. Function / Method Comments

- Must include: description, `@param` (for each parameter), `@returns` (unless the return type is `void`).
- Recommended but optional: `@example` (at least one usage example), `@throws` (errors that may be thrown).
- For asynchronous functions, describe the resolved value of the `Promise`.
- Orders of parts:
  - Description (Maybe markdown)
  - `@template` (If is generics)
  - `@param`
  - `@returns`
  - `@example` (Optional)
  - `@link`/`@see` (Optional)

**Example**:

````typescript
/**
 * Computes the sum of two numbers.
 * 
 * @template T - the data-type
 *
 * @param a - the first addend
 * @param b - the second addend
 * @returns the sum of the two numbers
 *
 * @example
 * ```ts
 * add(2, 3); // 5
 * ```
 */
export function add<T extends number>(a: T, b: T): T { ... }
````

### 4. Class / Interface / Type Alias Comments

- **Class**: describe the class’s responsibility, main methods or properties. Use `@remarks` for non‑obvious design
  decisions.
- **Interface**: explain the purpose of the interface and the contract that implementers must fulfill.
- **Type alias**: explain what concept this type represents, especially for union types or complex types.

**Example**:

```typescript
/**
 * Represents configurable HTTP request options.
 */
export interface RequestOptions {
  /** Request URL (required) */
  url: string;
  /** HTTP method, defaults to 'GET' */
  method?: "GET" | "POST";
}
```

### 5. Constant / Variable Comments

- Only add comments for exported constants or variables with clear business meaning.
- Describe what the constant’s value represents; mention units or formats when necessary.

### 6. Language and Style in Comments

- Use English (or another language as required by the project – here English is assumed).
- Use complete sentences ending with a period.
- Avoid first‑person (“we”, “I”); use imperative or passive phrasing.
- For tag descriptions (e.g., `@param`), start with a lowercase letter (except proper nouns).

### 7. What to Avoid

- ❌ Trivial comments (e.g., `// set variable x` for `let x = 5`).
- ❌ Comments that merely restate the code (e.g., `// loop over array` for a `for` loop).
- ❌ Outdated parameter / return tags.
- ❌ HTML tags inside comments (use Markdown instead, unless the rendering tool specifically supports HTML).

### 8. Checklist Before Adding a Comment for an Exported Symbol

- [ ] Module documentation exists (if this is a new file)
- [ ] Every parameter has a `@param` tag that matches the signature
- [ ] `@returns` is present (unless the function returns `void`)
- [ ] At least one `@example` is provided (for complex functions)
- [ ] No leftover temporary comments (`TODO`, `FIXME` – handle them separately)
