# @mainframework/is-deep-equal

A robust, recursive deep equality checker that handles complex structures including `Map`, `Set`, `Date`, `RegExp`, `Error`, `ArrayBuffer`, `DataView`, typed arrays, nested objects, circular references, and more — without mutating the input.

Built in TypeScript. Outputs a minified ESM module for JavaScript and TypeScript projects.

---

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [API](#api)
- [Usage](#usage)
- [Supported Types](#supported-types)
  - [Primitives](#primitives)
  - [Objects](#objects)
  - [Arrays](#arrays)
  - [Date](#date)
  - [RegExp](#regexp)
  - [Error](#error)
  - [Map](#map)
  - [Set](#set)
  - [Typed Arrays](#typed-arrays)
  - [ArrayBuffer](#arraybuffer)
  - [DataView](#dataview)
  - [Circular References](#circular-references)
  - [Boxed Primitives](#boxed-primitives)
  - [Prototype Mismatch](#prototype-mismatch)
  - [Functions](#functions)
  - [WeakMap, WeakSet, Promise](#weakmap-weakset-promise)
- [Options Reference](#options-reference)
- [Known Limitations](#known-limitations)
- [Tests](#tests)
- [License](#license)

---

## Installation

Using Yarn:

```bash
yarn add @mainframework/is-deep-equal
```

Using npm:

```bash
npm install @mainframework/is-deep-equal
```

---

## Features

- Deep comparison of primitives, arrays, objects, `Map`, `Set`, `Date`, `RegExp`, `Error`, typed arrays, `ArrayBuffer`, and `DataView`
- Handles circular references without infinite loops
- Order-independent comparison for `Map` and `Set`
- Compares enumerable symbol-keyed object properties
- Compares `NaN` as equal to itself
- Optional normalization of boxed primitives (`String`, `Number`, `Boolean`)
- Configurable sparse array handling
- Configurable prototype mismatch tolerance
- TypeScript support with `.d.ts` declarations
- ESM output for modern bundlers

---

## API

```typescript
isEqual(a: unknown, b: unknown, opts?: EqualityOptions): boolean
```

| Parameter | Description |
|-----------|-------------|
| `a` | First value to compare |
| `b` | Second value to compare |
| `opts` | Optional comparison settings (see [Options Reference](#options-reference)) |

Returns `true` if `a` and `b` are deeply equal, `false` otherwise.

```typescript
interface EqualityOptions {
  strictSparseArrays?: boolean;       // default: false — treat missing slots as distinct from undefined
  normalizeBoxedPrimitives?: boolean; // default: false — unwrap boxed primitives before comparison
  allowPrototypeMismatch?: boolean;   // default: false — ignore prototype chain differences
}
```

---

## Usage

```typescript
import { isEqual } from '@mainframework/is-deep-equal';
```

Exported types are available from the same entry point:

```typescript
import type { EqualityOptions } from '@mainframework/is-deep-equal';
```

---

## Supported Types

### Primitives

Primitive values are compared with strict equality. `NaN` compares as equal to itself. Symbols are compared by identity, so `Symbol.for` (global registry) symbols with the same key are equal, while locally created symbols are not.

```typescript
isEqual(1, 1)                            // true
isEqual('hello', 'hello')               // true
isEqual(true, true)                     // true
isEqual(null, null)                     // true
isEqual(undefined, undefined)           // true
isEqual(BigInt(42), BigInt(42))         // true
isEqual(Symbol.for('x'), Symbol.for('x')) // true

isEqual(1, 2)                           // false
isEqual(null, undefined)                // false
isEqual(Symbol('x'), Symbol('x'))       // false — different symbol instances

// NaN
isEqual(NaN, NaN)   // true
isEqual(NaN, 0)     // false
```

---

### Objects

Objects are compared by their enumerable own properties (string-keyed and symbol-keyed). Key insertion order does not matter. By default, objects with different prototypes are not equal.

```typescript
isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })          // true — order independent
isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }) // true — deeply nested

isEqual({ a: 1 }, { a: 2 })                        // false — different value
isEqual({ a: 1 }, { b: 1 })                        // false — different key
```

**Symbol-keyed properties** — enumerable symbol properties are included in the comparison:

```typescript
const sym = Symbol('key');
isEqual({ [sym]: 42 }, { [sym]: 42 })  // true
isEqual({ [sym]: 1 },  { [sym]: 2 })  // false

// Non-enumerable symbol keys are ignored
const hidden = Symbol('hidden');
const a = {};
Object.defineProperty(a, hidden, { value: 1, enumerable: false });
isEqual(a, {})  // true
```

---

### Arrays

Arrays are compared element-by-element in order. Nested arrays and mixed-type elements are fully traversed.

```typescript
isEqual([1, 2, 3], [1, 2, 3])     // true
isEqual([[1], [2]], [[1], [2]])    // true

isEqual([1, 2], [2, 1])           // false — order matters
isEqual([1, 2], [1, 2, 3])        // false — different length
```

**Sparse arrays** — by default a missing slot and `undefined` are treated as equal. Enable `strictSparseArrays` to distinguish them:

```typescript
isEqual([1, , 3], [1, undefined, 3])                              // true  (default)
isEqual([1, , 3], [1, undefined, 3], { strictSparseArrays: true }) // false
isEqual([1, , 3], [1, , 3],         { strictSparseArrays: true }) // true
```

---

### Date

Dates are compared by their UTC time value.

```typescript
isEqual(new Date('2024-01-01'), new Date('2024-01-01'))  // true
isEqual(new Date('2024-01-01'), new Date('2025-01-01'))  // false
```

---

### RegExp

Regular expressions are compared by `source` and `flags`.

```typescript
isEqual(/abc/gi, /abc/gi)  // true

isEqual(/abc/,  /def/)     // false — different source
isEqual(/abc/i, /abc/g)    // false — different flags
```

---

### Error

Errors are compared by `name`, `message`, `cause` (deep), and any enumerable own properties added to the instance.

```typescript
isEqual(new Error('oops'), new Error('oops'))  // true

// Different error type
isEqual(new TypeError('oops'), new RangeError('oops'))  // false

// Errors with nested cause
const cause = { code: 42 };
isEqual(
  new Error('fail', { cause }),
  new Error('fail', { cause: { code: 42 } })
)  // true

// Errors with custom own properties
const e1 = Object.assign(new Error('oops'), { code: 404 });
const e2 = Object.assign(new Error('oops'), { code: 404 });
const e3 = Object.assign(new Error('oops'), { code: 500 });
isEqual(e1, e2)  // true
isEqual(e1, e3)  // false
```

---

### Map

Maps are compared by their entries. Insertion order is ignored, and object keys are compared deeply.

```typescript
// Insertion order does not matter
isEqual(
  new Map([['a', 1], ['b', 2]]),
  new Map([['b', 2], ['a', 1]])
)  // true

// Different values
isEqual(new Map([['a', 1]]), new Map([['a', 2]]))  // false

// Object keys compared deeply
isEqual(
  new Map([[{ x: 1 }, { y: 2 }]]),
  new Map([[{ x: 1 }, { y: 2 }]])
)  // true

// Nested maps
const map1 = new Map([['users', new Map([['alice', { age: 30 }]])]]);
const map2 = new Map([['users', new Map([['alice', { age: 30 }]])]]);
isEqual(map1, map2)  // true
```

---

### Set

Sets are compared without regard to insertion order. Each element is matched by deep equality.

```typescript
isEqual(new Set([1, 2, 3]), new Set([3, 1, 2]))  // true — order independent

// Nested sets with object elements
const a = new Set([new Set([{ id: 1 }, { id: 2 }])]);
const b = new Set([new Set([{ id: 1 }, { id: 2 }])]);
isEqual(a, b)  // true

isEqual(new Set([1, 2]), new Set([2, 3]))  // false
```

**Complex nested example** — `Map` containing a `Set` with a nested `Set` and `Map` of objects:

```typescript
const set1 = new Set([
  new Set([{ foo: 'bar' }, { baz: 42 }]),
  new Map([['one', { a: 1 }], ['two', { b: 2 }]]),
]);
const set2 = new Set([
  new Set([{ foo: 'bar' }, { baz: 42 }]),
  new Map([['one', { a: 1 }], ['two', { b: 2 }]]),
]);

isEqual(new Map([['data', set1]]), new Map([['data', set2]]))  // true
```

---

### Typed Arrays

Typed arrays of the same type are compared byte-by-byte. Arrays of different types are not equal even if the underlying bytes match.

```typescript
isEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))   // true
isEqual(new Int16Array([1, 2]),    new Int16Array([1, 2]))       // true

isEqual(new Uint8Array([1, 2]), new Int8Array([1, 2]))           // false — different types
isEqual(new Uint8Array([1, 2]), new Uint8Array([2, 1]))          // false — different values
```

---

### ArrayBuffer

ArrayBuffers are compared byte-by-byte.

```typescript
const a = new Uint8Array([1, 2, 3, 4]).buffer;
const b = new Uint8Array([1, 2, 3, 4]).buffer;
isEqual(a, b)  // true

const c = new Uint8Array([1, 2, 3, 5]).buffer;
isEqual(a, c)  // false
```

---

### DataView

DataViews are compared by the bytes they describe, respecting `byteOffset` and `byteLength`.

```typescript
const bufA = new Uint8Array([0, 10, 20, 30, 40]).buffer;
const bufB = new Uint8Array([0, 10, 20, 30, 40]).buffer;

// Views over the same slice
const a = new DataView(bufA, 1, 4);
const b = new DataView(bufB, 1, 4);
isEqual(a, b)  // true

const bufC = new Uint8Array([0, 10, 20, 30, 99]).buffer;
const c = new DataView(bufC, 1, 4);
isEqual(a, c)  // false
```

---

### Circular References

Circular references are detected and handled without throwing. Objects that form the same circular structure are considered equal.

```typescript
const a: any = { foo: {} };
a.foo.bar = a;

const b: any = { foo: {} };
b.foo.bar = b;

isEqual(a, b)  // true

// Mismatched structure
const c: any = { foo: {} };
c.foo.bar = {};
isEqual(a, c)  // false
```

> **Known limitation:** Structurally non-isomorphic cycles (for example, a two-node mutual reference vs. a self-loop) may incorrectly compare as equal. See [Known Limitations](#known-limitations).

---

### Boxed Primitives

By default, `new String('a')` and `'a'` are not equal — they have different types. Enable `normalizeBoxedPrimitives` to unwrap them before comparison.

```typescript
// Default — no normalization
isEqual(new String('a'),    'a')     // false
isEqual(new Number(1),      1)       // false
isEqual(new Boolean(true),  true)    // false

// With normalization
isEqual(new String('a'),   'a',    { normalizeBoxedPrimitives: true })  // true
isEqual(new Number(1),     1,      { normalizeBoxedPrimitives: true })  // true
isEqual(new Boolean(true), true,   { normalizeBoxedPrimitives: true })  // true

// Two boxed-primitive objects with extra own properties
const s1 = Object.assign(new String('a'), { x: 1 });
const s2 = Object.assign(new String('a'), { x: 1 });
isEqual(s1, s2)  // true

const s3 = Object.assign(new String('a'), { x: 2 });
isEqual(s1, s3)  // false
```

---

### Prototype Mismatch

By default, objects with different prototypes are not equal, even if they have the same shape. Set `allowPrototypeMismatch: true` to ignore prototype differences.

```typescript
class A { x = 1; }
class B { x = 1; }

isEqual(new A(), new B())                              // false — different prototypes
isEqual(new A(), new B(), { allowPrototypeMismatch: true })  // true

// Object with no prototype vs plain object
const noProto = Object.create(null);
noProto.x = 1;

isEqual(noProto, { x: 1 })                              // false
isEqual(noProto, { x: 1 }, { allowPrototypeMismatch: true })  // true
```

---

### Functions

Functions are compared by reference only. Two functions with identical source code but different identities are not equal.

```typescript
const fn = () => {};
isEqual(fn, fn)        // true  — same reference

const fn2 = () => {};
isEqual(fn, fn2)       // false — different references
```

---

### WeakMap, WeakSet, Promise

`WeakMap`, `WeakSet`, and `Promise` cannot be iterated or inspected for equality, so any comparison involving them always returns `false`.

```typescript
isEqual(new WeakMap(),       new WeakMap())       // false
isEqual(new WeakSet(),       new WeakSet())       // false
isEqual(Promise.resolve(1),  Promise.resolve(1))  // false
```

---

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strictSparseArrays` | `boolean` | `false` | When `true`, a missing array slot and an explicit `undefined` at the same index are treated as different |
| `normalizeBoxedPrimitives` | `boolean` | `false` | When `true`, boxed primitives (`new String`, `new Number`, `new Boolean`) are unwrapped to their primitive value before comparison |
| `allowPrototypeMismatch` | `boolean` | `false` | When `true`, objects with different prototype chains are considered equal if their enumerable own properties match |

---

## Known Limitations

**Circular reference non-isomorphism:** When a cycle is detected, the comparison optimistically returns `true` to break recursion. As a result, two structurally different cycles — for example, a self-loop (`a.self = a`) versus a two-node mutual reference (`a.next = b; b.next = a`) — may be reported as equal when they are not.

**WeakMap / WeakSet / Promise:** These types are always `false` because their contents cannot be enumerated.

---

## Tests

This library uses [Vitest](https://vitest.dev) for testing.

```bash
yarn test
# or
npm run test
```

Test coverage includes:

- Primitives and edge cases (`NaN`, `BigInt`, `Symbol`)
- Objects (key order, symbol-keyed properties, prototype mismatch)
- Arrays (nested, sparse)
- `Date`, `RegExp`, `Error` (with cause and custom properties)
- `Map` and `Set` (insertion-order independence, object keys/values)
- Typed arrays, `ArrayBuffer`, `DataView`
- Circular references
- Boxed primitives (with and without normalization)
- Functions, `WeakMap`, `WeakSet`, `Promise`

Refer to the [`test/`](test/) folder for the full test suite.

---

## License

MIT © is-deep-equal
