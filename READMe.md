# @mainframework/is-deep-equal

A robust, recursive deep equality checker that handles complex structures including `Map`, `Set`, `Date`, `nested objects`, `circular references`, and more — without mutating the input.

Built in TypeScript. Outputs a minified ESM module for JavaScript and TypeScript projects.

---

## 📦 Installation

Using **Yarn**:
yarn add @mainframework/is-deep-equal

Using **Npm**:
npm install @mainframework/is-deep-equal

✨ Features
✅ Deep comparison of: Primitives, Arrays, Objects, Map, Set, Date, Typed Arrays, Circular references
✅ Optional normalization of boxed primitives (String, Number, Boolean)
✅ TypeScript support with .d.ts declarations
✅ ESM output for modern bundlers
✅ Handles sparse arrays and prototype mismatches (configurable)

🔄 API

```TypeScript
isEqual(a: unknown, b: unknown, opts?: EqualityOptions): boolean
```
a – First value to compare

b – Second value to compare

opts – Optional comparison settings:

Returns true if values a and b are deeply equal, false otherwise.

```TypeScript
interface EqualityOptions {
  strictSparseArrays?: boolean;       // Differentiates between missing array elements and undefined
  normalizeBoxedPrimitives?: boolean; // Unwraps boxed primitives before comparison
  allowPrototypeMismatch?: boolean;    // Ignore prototype differences for objects
}
```

🔧 Usage
```TypeScript
import { isEqual } from '@mainframework/is-deep-equal';
```

Exported types are available from the same entrypoint:

```TypeScript
import type { EqualityOptions } from '@mainframework/is-deep-equal';
```

🔁 Example: Map containing a Set with nested Set and Map of objects

```TypeScript
const nestedSet = new Set([{ foo: 'bar' }, { baz: 42 }]);
const nestedMap = new Map([
  ['one', { a: 1 }],
  ['two', { b: 2 }],
]);

const set1 = new Set([nestedSet, nestedMap]);
const set2 = new Set([
  new Set([{ foo: 'bar' }, { baz: 42 }]),
  new Map([
    ['one', { a: 1 }],
    ['two', { b: 2 }],
  ]),
]);

const map1 = new Map([['data', set1]]);
const map2 = new Map([['data', set2]]);

console.log(isEqual(map1, map2)); // true

```

🔁 Example: Set containing a Map with a nested Set and Map of objects

```TypeScript
const deepSet1 = new Set([
  new Set([{ foo: 'bar' }, { baz: 42 }]),
  new Map([
    ['one', { a: 1 }],
    ['two', { b: 2 }],
  ]),
]);
const map1 = new Map([['deep', deepSet1]]);
const outerSet1 = new Set([map1]);

const deepSet2 = new Set([
  new Set([{ foo: 'bar' }, { baz: 42 }]),
  new Map([
    ['one', { a: 1 }],
    ['two', { b: 2 }],
  ]),
]);
const map2 = new Map([['deep', deepSet2]]);
const outerSet2 = new Set([map2]);

console.log(isEqual(outerSet1, outerSet2)); // true

```

🔁 Example: Mismatching inner object value

```TypeScript
const badNestedSet = new Set([{ foo: 'bar' }, { baz: 999 }]); // 999 instead of 42
const goodNestedMap = new Map([
  ['one', { a: 1 }],
  ['two', { b: 2 }],
]);

const setWithBadData = new Set([badNestedSet, goodNestedMap]);
const map1 = new Map([['data', setWithBadData]]);

const correctNestedSet = new Set([{ foo: 'bar' }, { baz: 42 }]);
const correctMap = new Map([
  ['one', { a: 1 }],
  ['two', { b: 2 }],
]);
const setWithGoodData = new Set([correctNestedSet, correctMap]);
const map2 = new Map([['data', setWithGoodData]]);

console.log(isEqual(map1, map2)); // false

```

Boxed primitives with normalization
```TypeScript
console.log(isEqual(new String('a'), 'a', { normalizeBoxedPrimitives: true })); // true
console.log(isEqual(new Number(1), 1, { normalizeBoxedPrimitives: true })); // true
console.log(isEqual(new Boolean(true), true, { normalizeBoxedPrimitives: true })); // true
```

# Tests

🧪 Running Tests
This library uses Vitest for testing.

Run tests with Yarn:
yarn test
or npm run test

Test coverage includes:

Primitives and edge cases

Boxed primitives

Arrays and nested objects

Circular references

Deeply nested Map and Set combinations

Sparse arrays and prototype mismatch cases

Refer to the test/ folder for the full test suite.

📝 License
MIT © is-deep-equal
