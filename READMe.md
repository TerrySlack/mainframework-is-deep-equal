# is-equal

A robust, recursive deep equality checker that handles complex structures including `Map`, `Set`, `Date`, `nested objects`, `circular references`, and more — without mutating the input.

Built in TypeScript. Outputs a minified ESM module for JavaScript and TypeScript projects.

---

## 📦 Installation

Using **Yarn**:
yarn add is-equal

Using **Npm**:
npm install is-equal

✨ Features
✅ Deep comparison of: Primitives, Arrays, ObjectsMap, Set, Date, Circular references
✅ TypeScript support with .d.ts declarations
✅ ESM output for modern bundlers

🔄 API

```TypeScript
isEqual(a: unknown, b: unknown): boolean
```

Returns true if values a and b are deeply equal.

🔧 Usage
import { isEqual } from 'is-equal';

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

# Tests

🧪 Running Tests
Basic tests use Vitest:
yarn test
or npm run test

Tests include:

Primitives and edge cases

Arrays and nested objects

Circular references

Deeply nested Map and Set combinations

Refer to the test/ folder for full coverage.

📝 License
MIT © is-deep-equal
