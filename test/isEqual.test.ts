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

  it("compares invalid dates as equal", () => {
    expect(isEqual(new Date("not-a-date"), new Date("also-invalid"))).toBe(true);
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

  it("compares errors with custom own properties", () => {
    const e1 = Object.assign(new Error("oops"), { code: 404 });
    const e2 = Object.assign(new Error("oops"), { code: 404 });
    const e3 = Object.assign(new Error("oops"), { code: 500 });
    expect(isEqual(e1, e2)).toBe(true);
    expect(isEqual(e1, e3)).toBe(false);
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
describe("isEqual - maps", () => {
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

  it("returns false when a cycle-assumption cache would poison a later Set rematch", () => {
    const c: any = { extra: 1 };
    const d: any = { extra: 1 };
    const x: any = { child: c, stamp: 1 };
    const y: any = { child: d, stamp: 2 };
    const x2: any = { child: c, stamp: 1 };
    c.up = x;
    d.up = y;
    const p = { child: d, stamp: 2 };

    expect(isEqual(new Set([x, c, p]), new Set([y, d, x2]))).toBe(false);
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

  it("compares two identical boxed-primitive objects with extra properties", () => {
    const s1 = Object.assign(new String("a"), { x: 1 });
    const s2 = Object.assign(new String("a"), { x: 1 });
    expect(isEqual(s1, s2)).toBe(true);
  });

  it("returns false for boxed-primitive objects with differing extra properties", () => {
    const s1 = Object.assign(new String("a"), { x: 1 });
    const s2 = Object.assign(new String("a"), { x: 2 });
    expect(isEqual(s1, s2)).toBe(false);
  });

  it("returns false for boxed Number and Boolean with different wrapped values", () => {
    expect(isEqual(new Number(1), new Number(2))).toBe(false);
    expect(isEqual(new Boolean(true), new Boolean(false))).toBe(false);
  });

  it("returns false for boxed numbers with the same extra keys and different wrapped values", () => {
    const n1 = Object.assign(new Number(1), { x: 1 });
    const n2 = Object.assign(new Number(2), { x: 1 });
    expect(isEqual(n1, n2)).toBe(false);
  });

  it("still deep-compares boxed primitives with own properties when normalized", () => {
    const s1 = Object.assign(new String("a"), { x: 1 });
    const s2 = Object.assign(new String("a"), { x: 2 });
    expect(isEqual(s1, s2, { normalizeBoxedPrimitives: true })).toBe(false);
  });
});

describe("isEqual - sparse arrays", () => {
  it("compares sparse arrays when strictSparseArrays=false", () => {
    expect(isEqual([1, , 3], [1, undefined, 3])).toBe(true);
  });

  it("compares sparse arrays when strictSparseArrays=true", () => {
    expect(isEqual([1, , 3], [1, undefined, 3], { strictSparseArrays: true })).toBe(false);
  });

  it("returns true for two identical sparse arrays under strictSparseArrays=true", () => {
    expect(isEqual([1, , 3], [1, , 3], { strictSparseArrays: true })).toBe(true);
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

  it("returns true for typed arrays with unaligned byteOffset and equal bytes", () => {
    const buf1 = new Uint8Array([0, 10, 20, 30, 40]).buffer;
    const buf2 = new Uint8Array([0, 10, 20, 30, 40]).buffer;
    const a = new Uint8Array(buf1, 1, 4);
    const b = new Uint8Array(buf2, 1, 4);
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for typed arrays with unaligned byteOffset and different bytes", () => {
    const buf1 = new Uint8Array([0, 10, 20, 30, 40]).buffer;
    const buf2 = new Uint8Array([0, 10, 20, 30, 99]).buffer;
    const a = new Uint8Array(buf1, 1, 4);
    const b = new Uint8Array(buf2, 1, 4);
    expect(isEqual(a, b)).toBe(false);
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

describe("isEqual - NaN", () => {
  it("returns true for NaN compared to NaN", () => {
    expect(isEqual(NaN, NaN)).toBe(true);
  });

  it("returns false for NaN compared to 0", () => {
    expect(isEqual(NaN, 0)).toBe(false);
  });

  it("distinguishes +0 and -0", () => {
    expect(isEqual(0, -0)).toBe(false);
    expect(isEqual(-0, -0)).toBe(true);
  });
});

describe("isEqual - Error additional cases", () => {
  it("returns false for errors with different names", () => {
    expect(isEqual(new TypeError("oops"), new RangeError("oops"))).toBe(false);
  });

  it("returns true for errors with matching cause objects", () => {
    const cause = { code: 42 };
    const e1 = new Error("fail", { cause });
    const e2 = new Error("fail", { cause: { code: 42 } });
    expect(isEqual(e1, e2)).toBe(true);
  });

  it("returns false for errors with mismatched cause", () => {
    const e1 = new Error("fail", { cause: { code: 1 } });
    const e2 = new Error("fail", { cause: { code: 2 } });
    expect(isEqual(e1, e2)).toBe(false);
  });

  it("compares enumerable own symbol properties on errors", () => {
    const sym = Symbol("key");
    const e1 = new Error("oops");
    const e2 = new Error("oops");
    const e3 = new Error("oops");
    (e1 as any)[sym] = 1;
    (e2 as any)[sym] = 1;
    (e3 as any)[sym] = 2;
    expect(isEqual(e1, e2)).toBe(true);
    expect(isEqual(e1, e3)).toBe(false);
  });
});

describe("isEqual - RegExp", () => {
  it("returns true for regexps with the same source and flags", () => {
    expect(isEqual(/abc/gi, /abc/gi)).toBe(true);
  });

  it("returns false for regexps with different source", () => {
    expect(isEqual(/abc/, /def/)).toBe(false);
  });

  it("returns false for regexps with different flags", () => {
    expect(isEqual(/abc/i, /abc/g)).toBe(false);
  });

  it("returns false for regexps with same source but different flags", () => {
    expect(isEqual(/abc/i, /abc/)).toBe(false);
  });
});

describe("isEqual - ArrayBuffer", () => {
  it("returns true for ArrayBuffers with the same bytes", () => {
    const a = new Uint8Array([1, 2, 3, 4]).buffer;
    const b = new Uint8Array([1, 2, 3, 4]).buffer;
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for ArrayBuffers with different lengths", () => {
    const a = new Uint8Array([1, 2, 3]).buffer;
    const b = new Uint8Array([1, 2, 3, 4]).buffer;
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns false for ArrayBuffers with same length but different bytes", () => {
    const a = new Uint8Array([1, 2, 3, 4]).buffer;
    const b = new Uint8Array([1, 2, 3, 5]).buffer;
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns true for equal ArrayBuffers whose length is not a multiple of 8 (tail-byte path)", () => {
    const a = new Uint8Array([10, 20, 30]).buffer;
    const b = new Uint8Array([10, 20, 30]).buffer;
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for unequal ArrayBuffers whose length is not a multiple of 8 (tail-byte path)", () => {
    const a = new Uint8Array([10, 20, 30]).buffer;
    const b = new Uint8Array([10, 20, 99]).buffer;
    expect(isEqual(a, b)).toBe(false);
  });
});

describe("isEqual - WeakMap, WeakSet, Promise", () => {
  it("returns false for two WeakMaps", () => {
    expect(isEqual(new WeakMap(), new WeakMap())).toBe(false);
  });

  it("returns false for two WeakSets", () => {
    expect(isEqual(new WeakSet(), new WeakSet())).toBe(false);
  });

  it("returns false for two Promises", () => {
    expect(isEqual(Promise.resolve(1), Promise.resolve(1))).toBe(false);
  });
});

describe("isEqual - symbol-keyed object properties", () => {
  it("returns true for objects with matching enumerable symbol keys and values", () => {
    const sym = Symbol("key");
    const a = { [sym]: 42 };
    const b = { [sym]: 42 };
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false when a symbol key is present on one object but not the other", () => {
    const sym = Symbol("key");
    const a = { [sym]: 1 };
    const b = {};
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns false for objects with the same symbol key but different values", () => {
    const sym = Symbol("key");
    const a = { [sym]: 1 };
    const b = { [sym]: 2 };
    expect(isEqual(a, b)).toBe(false);
  });

  it("ignores non-enumerable symbol keys (does not affect equality result)", () => {
    const sym = Symbol("hidden");
    const a = {};
    const b = {};
    Object.defineProperty(a, sym, { value: 1, enumerable: false });
    expect(isEqual(a, b)).toBe(true);
  });
});

describe("isEqual - DataView", () => {
  it("returns true for DataViews with aligned byteOffset and equal bytes", () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).buffer;
    const a = new DataView(buf, 0, 8);
    const b = new DataView(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer, 0, 8);
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for DataViews with aligned byteOffset and different bytes", () => {
    const a = new DataView(new Uint8Array([1, 2, 3, 4]).buffer, 0, 4);
    const b = new DataView(new Uint8Array([1, 2, 3, 9]).buffer, 0, 4);
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns true for DataViews with unaligned byteOffset and equal bytes", () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    const a = new DataView(backing, 1, 4);
    const b = new DataView(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]).buffer, 1, 4);
    expect(isEqual(a, b)).toBe(true);
  });

  it("returns false for DataViews with unaligned byteOffset and different bytes", () => {
    const buf1 = new Uint8Array([0, 1, 2, 3, 4]).buffer;
    const buf2 = new Uint8Array([0, 1, 2, 3, 9]).buffer;
    const a = new DataView(buf1, 1, 4);
    const b = new DataView(buf2, 1, 4);
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns false for DataViews with different byteLength", () => {
    const buf = new Uint8Array(8).buffer;
    expect(isEqual(new DataView(buf, 0, 4), new DataView(buf, 0, 8))).toBe(false);
  });
});

describe("isEqual - shapeKey bucketing", () => {
  it("compares sets whose members exercise primitive shape keys", () => {
    const sym = Symbol.for("shape");
    const values = [null, true, false, 1n, sym, undefined];
    expect(isEqual(new Set(values), new Set(values))).toBe(true);
  });

  it("compares sets containing Date, RegExp, ArrayBuffer, and typed array members", () => {
    const buf = new Uint8Array([1]).buffer;
    const a = new Set([new Date(0), /x/, buf, new Uint8Array([1])]);
    const b = new Set([new Date(0), /x/, new Uint8Array([1]).buffer, new Uint8Array([1])]);
    expect(isEqual(a, b)).toBe(true);
  });

  it("compares sets containing objects with null prototype", () => {
    const x = Object.assign(Object.create(null), { k: 1 });
    const y = Object.assign(Object.create(null), { k: 1 });
    expect(isEqual(new Set([x]), new Set([y]))).toBe(true);
  });

  it("compares sets containing arrays", () => {
    expect(isEqual(new Set([[1, 2]]), new Set([[1, 2]]))).toBe(true);
  });
});

describe("isEqual - compareError branches", () => {
  it("returns false for errors with different messages", () => {
    expect(isEqual(new Error("a"), new Error("b"))).toBe(false);
  });

  it("returns false when enumerable own string key counts differ", () => {
    expect(isEqual(Object.assign(new Error("e"), { code: 1 }), new Error("e"))).toBe(false);
  });

  it("returns false when enumerable own symbol key counts differ", () => {
    const sym = Symbol("extra");
    const e1 = new Error("e");
    (e1 as any)[sym] = 1;
    expect(isEqual(e1, new Error("e"))).toBe(false);
  });
});

describe("isEqual - typed array byteLength", () => {
  it("returns false for typed arrays with different byteLength", () => {
    expect(isEqual(new Uint8Array(2), new Uint8Array(3))).toBe(false);
  });
});

describe("isEqual - compareBytes aligned chunk path", () => {
  it("returns false for equal-length ArrayBuffers that differ in an aligned 8-byte chunk", () => {
    const a = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]).buffer;
    const b = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 2]).buffer;
    expect(isEqual(a, b)).toBe(false);
  });
});

describe("isEqual - compareSet branches", () => {
  it("returns false when set sizes differ", () => {
    expect(isEqual(new Set([1, 2]), new Set([1]))).toBe(false);
  });

  it("returns false when set bucket counts differ", () => {
    expect(isEqual(new Set([1, 2]), new Set([1, "2"]))).toBe(false);
  });

  it("returns false when a set bucket key is missing on the other side", () => {
    expect(isEqual(new Set([1]), new Set(["1"]))).toBe(false);
  });

  it("returns false when matching set bucket lengths differ", () => {
    expect(isEqual(new Set([{ a: 1 }, { b: 2 }, 9]), new Set([{ a: 1 }, 2, 3]))).toBe(false);
  });
});

describe("isEqual - compareMap branches", () => {
  it("returns false when map sizes differ", () => {
    expect(isEqual(new Map([[1, 1]]), new Map([[1, 1], [2, 2]]))).toBe(false);
  });

  it("returns false when map bucket counts differ", () => {
    expect(isEqual(new Map([["a", 1]]), new Map([[1, 1]]))).toBe(false);
    expect(
      isEqual(new Map([[{ x: 1 }, 1], [{ y: 2 }, 2]]), new Map([[{ x: 1 }, 1], [2, 2]])),
    ).toBe(false);
  });

  it("returns false when a map bucket key is missing on the other side", () => {
    expect(isEqual(new Map([[{ a: 1 }, 1]]), new Map([[1, 1]]))).toBe(false);
  });

  it("returns false when matching map bucket lengths differ", () => {
    const mapA = new Map<unknown, number>([
      [{ x: 1 }, 1],
      [{ y: 2 }, 2],
      [1, 3],
    ]);
    const mapB = new Map<unknown, number>([
      [{ x: 1 }, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(isEqual(mapA, mapB)).toBe(false);
  });
});

describe("isEqual - memo cache hits", () => {
  it("reuses a successful memo when the same object pair is compared again", () => {
    const left = { v: 1 };
    const right = { v: 1 };
    expect(isEqual({ p: left, q: left }, { p: right, q: right })).toBe(true);
  });

  it("reuses a failed memo when the same object pair is compared again", () => {
    const left = { v: 1 };
    const right = { v: 2 };
    expect(isEqual({ p: left, q: left }, { p: right, q: right })).toBe(false);
  });
});

describe("isEqual - prototype chain without constructor mismatch", () => {
  it("returns false when prototypes differ but own constructor properties match", () => {
    const C = function Ctor() {};
    const a = Object.assign(Object.create(null), { constructor: C, x: 1 });
    const b = Object.assign(Object.create(Object.prototype), { constructor: C, x: 1 });
    expect(isEqual(a, b)).toBe(false);
  });
});

describe("isEqual - boxed primitive valueOf", () => {
  it("returns false for boxed booleans with different valueOf results", () => {
    expect(isEqual(new Boolean(true), new Boolean(false))).toBe(false);
  });

  it("returns false for boxed strings with different valueOf results", () => {
    expect(isEqual(new String("a"), new String("b"))).toBe(false);
  });

  it("compares boxed numbers with equal valueOf results via Object.is", () => {
    expect(isEqual(new Number(NaN), new Number(NaN))).toBe(true);
  });

  it("deep-compares two boxed strings when normalizeBoxedPrimitives is enabled", () => {
    expect(isEqual(new String("a"), new String("a"), { normalizeBoxedPrimitives: true })).toBe(true);
  });
});

describe("isEqual - WeakMap vs Map", () => {
  it("returns false when one side is a WeakMap and the other is a Map", () => {
    expect(isEqual(new WeakMap(), new Map())).toBe(false);
  });
});

const detachArrayBuffer = (byteLength = 8): ArrayBuffer => {
  const buffer = new ArrayBuffer(byteLength);
  structuredClone(new Uint8Array(buffer), { transfer: [buffer] });
  return buffer;
};

describe("isEqual - detached ArrayBuffer and DataView", () => {
  it("returns false when comparing two detached ArrayBuffers without throwing", () => {
    expect(isEqual(detachArrayBuffer(), detachArrayBuffer())).toBe(false);
  });

  it("returns false when comparing a detached ArrayBuffer to a normal ArrayBuffer without throwing", () => {
    expect(isEqual(detachArrayBuffer(), new ArrayBuffer(8))).toBe(false);
  });

  it("returns false when comparing DataViews backed by detached buffers without throwing", () => {
    const buffer = new ArrayBuffer(4);
    const a = new DataView(buffer, 0, 4);
    structuredClone(new Uint8Array(buffer), { transfer: [buffer] });
    const b = new DataView(new ArrayBuffer(4), 0, 4);
    expect(isEqual(a, b)).toBe(false);
  });

  it("returns false when comparing typed arrays backed by detached buffers without throwing", () => {
    const buffer = new ArrayBuffer(4);
    const a = new Uint8Array(buffer);
    structuredClone(new Uint8Array(buffer), { transfer: [buffer] });
    const b = new Uint8Array(4);
    expect(isEqual(a, b)).toBe(false);
  });
});
