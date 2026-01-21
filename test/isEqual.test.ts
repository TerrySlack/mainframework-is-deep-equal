import { describe, it, expect } from "vitest";
import { isEqual } from "../src";

describe("isEqual - primitives", () => {
  it("compares identical primitives", () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual("hello", "hello")).toBe(true);
    expect(isEqual(true, true)).toBe(true);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(undefined, undefined)).toBe(true);
    expect(isEqual(Symbol.for("x"), Symbol.for("x"))).toBe(true);
    expect(isEqual(BigInt(42), BigInt(42))).toBe(true);
  });

  it("compares different primitives", () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual("a", "b")).toBe(false);
    expect(isEqual(true, false)).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
    expect(isEqual(Symbol("x"), Symbol("x"))).toBe(false); // new symbols are not equal
  });
});

describe("isEqual - arrays", () => {
  it("compares shallow equal arrays", () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("compares nested arrays", () => {
    expect(isEqual([[1], [2]], [[1], [2]])).toBe(true);
  });

  it("returns false for arrays with different lengths or values", () => {
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqual([1, 2], [2, 1])).toBe(false);
  });
});

describe("isEqual - objects", () => {
  it("compares shallow objects", () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
  });

  it("compares deeply nested objects", () => {
    expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
  });

  it("compares objects with different key orders", () => {
    expect(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("returns false for mismatched keys or values", () => {
    expect(isEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("isEqual - special types", () => {
  it("compares dates", () => {
    expect(isEqual(new Date("2020-01-01"), new Date("2020-01-01"))).toBe(true);
    expect(isEqual(new Date("2020-01-01"), new Date("2021-01-01"))).toBe(false);
  });

  it("compares different prototypes", () => {
    class A {
      x = 1;
    }
    class B {
      x = 1;
    }

    expect(isEqual(new A(), new A())).toBe(true);
    expect(isEqual(new A(), new B())).toBe(false);
  });
});

describe("isEqual - sets", () => {
  it("compares simple sets", () => {
    expect(isEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
  });

  it("compares nested sets", () => {
    const a = new Set([new Set([1, 2])]);
    const b = new Set([new Set([1, 2])]);
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for sets with different values", () => {
    expect(isEqual(new Set([1, 2]), new Set([2, 3]))).toBe(false);
  });
});

describe("isEqual - nested Map of objects", () => {
  it("compares deeply nested maps with object values", () => {
    const obj1 = { name: "Alice" };
    const obj2 = { name: "Bob" };

    const map1 = new Map<string, Map<string, object>>();
    const map2 = new Map<string, Map<string, object>>();

    map1.set(
      "users",
      new Map([
        ["user1", obj1],
        ["user2", obj2],
      ]),
    );
    map2.set(
      "users",
      new Map([
        ["user1", { name: "Alice" }],
        ["user2", { name: "Bob" }],
      ]),
    );

    expect(isEqual(map1, map2)).toBe(true);
  });
});

describe("isEqual - nested Set of objects", () => {
  it("compares sets containing sets of objects", () => {
    const nestedSet1 = new Set([{ id: 1 }, { id: 2 }]);
    const nestedSet2 = new Set([{ id: 1 }, { id: 2 }]);

    const set1 = new Set<Set<object>>([nestedSet1]);
    const set2 = new Set<Set<object>>([nestedSet2]);

    expect(isEqual(set1, set2)).toBe(true);
  });
});

describe("isEqual - maps", () => {
  it("compares simple maps", () => {
    expect(
      isEqual(
        new Map([
          ["a", 1],
          ["b", 2],
        ]),
        new Map([
          ["b", 2],
          ["a", 1],
        ]),
      ),
    ).toBe(true);
  });

  it("compares nested maps", () => {
    const a = new Map([[{ x: 1 }, { y: 2 }]]);
    const b = new Map([[{ x: 1 }, { y: 2 }]]);
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for maps with different values or keys", () => {
    expect(isEqual(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);

    expect(isEqual(new Map([["a", 1]]), new Map([["b", 1]]))).toBe(false);
  });
});
describe("isEqual - circular references", () => {
  it("returns false when nested maps have different object values", () => {
    const map1 = new Map([["group", new Map([["a", { x: 1 }]])]]);
    const map2 = new Map([["group", new Map([["a", { x: 2 }]])]]);

    expect(isEqual(map1, map2)).toBe(false);
  });
});

describe("isEqual - circular references", () => {
  it("compares simple circular objects", () => {
    const a: any = {};
    a.self = a;
    const b: any = {};
    b.self = b;
    expect(isEqual(a, b)).toBe(true);
  });

  it("compares complex circular structures", () => {
    const a: any = { foo: {} };
    a.foo.bar = a;

    const b: any = { foo: {} };
    b.foo.bar = b;

    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for mismatched circular structures", () => {
    const a: any = { foo: {} };
    a.foo.bar = a;

    const b: any = { foo: {} };
    b.foo.bar = {};

    expect(isEqual(a, b)).toBe(false);
  });
});

describe("isEqual - mixed types and edge cases", () => {
  it("returns false when types differ", () => {
    expect(isEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(isEqual(new Set(), new Map())).toBe(false);
  });

  it("compares empty objects and arrays", () => {
    expect(isEqual({}, {})).toBe(true);
    expect(isEqual([], [])).toBe(true);
  });

  it("returns false for null vs object", () => {
    expect(isEqual(null, {})).toBe(false);
  });

  it("returns false for undefined vs null", () => {
    expect(isEqual(undefined, null)).toBe(false);
  });
});
describe("isEqual - boxed primitives", () => {
  it("compares boxed primitives without normalization", () => {
    expect(isEqual(new String("a"), "a")).toBe(false);
    expect(isEqual(new Number(1), 1)).toBe(false);
    expect(isEqual(new Boolean(true), true)).toBe(false);
  });

  it("compares boxed primitives with normalization", () => {
    expect(isEqual(new String("a"), "a", { normalizeBoxedPrimitives: true })).toBe(true);
    expect(isEqual(new Number(1), 1, { normalizeBoxedPrimitives: true })).toBe(true);
    expect(isEqual(new Boolean(true), true, { normalizeBoxedPrimitives: true })).toBe(true);
  });

  it("compares boxed primitives with extra properties", () => {
    const s1 = Object.assign(new String("a"), { x: 1 });
    const s2 = Object.assign(new String("a"), { x: 1 });
    expect(isEqual(s1, s2, { normalizeBoxedPrimitives: true })).toBe(true);
  });
});

describe("isEqual - sparse arrays", () => {
  it("compares sparse arrays when strictSparseArrays=false", () => {
    expect(isEqual([1, , 3], [1, undefined, 3])).toBe(true);
  });

  it("compares sparse arrays when strictSparseArrays=true", () => {
    expect(isEqual([1, , 3], [1, undefined, 3], { strictSparseArrays: true })).toBe(false);
  });
});

describe("isEqual - typed arrays", () => {
  it("compares typed arrays with same contents", () => {
    expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
  });

  it("returns false for typed arrays of different types", () => {
    expect(isEqual(new Uint8Array([1, 2]), new Int8Array([1, 2]))).toBe(false);
  });

  it("returns false for typed arrays with different contents", () => {
    expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([2, 1]))).toBe(false);
  });
});

describe("isEqual - prototype mismatch", () => {
  it("returns true when allowPrototypeMismatch=true", () => {
    const a = Object.create(null);
    a.x = 1;
    const b = { x: 1 };
    expect(isEqual(a, b, { allowPrototypeMismatch: true })).toBe(true);
  });

  it("returns false when allowPrototypeMismatch=false", () => {
    const a = Object.create(null);
    a.x = 1;
    const b = { x: 1 };
    expect(isEqual(a, b)).toBe(false);
  });
});

describe("isEqual - function reference", () => {
  it("compares functions by reference only", () => {
    const fn1 = () => {};
    const fn2 = () => {};
    expect(isEqual(fn1, fn1)).toBe(true);
    expect(isEqual(fn1, fn2)).toBe(false);
  });
});
