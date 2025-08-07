import { describe, it, expect } from "vitest";
import { isEqual } from "../src";

const createNestedSetAndMap = () => {
  const nestedSet = new Set([{ foo: "bar" }, { baz: 42 }]);
  const nestedMap = new Map([
    ["one", { a: 1 }],
    ["two", { b: 2 }],
  ]);
  return { nestedSet, nestedMap };
};

describe("isEqual - deeply nested Map and Set combinations", () => {
  it("Map containing a Set with nested Set and Map of objects", () => {
    const { nestedSet, nestedMap } = createNestedSetAndMap();

    const set1 = new Set([nestedSet, nestedMap]);
    const set2 = new Set([
      new Set([{ foo: "bar" }, { baz: 42 }]),
      new Map([
        ["one", { a: 1 }],
        ["two", { b: 2 }],
      ]),
    ]);

    const map1 = new Map([["data", set1]]);
    const map2 = new Map([["data", set2]]);

    expect(isEqual(map1, map2)).toBe(true);
  });

  it("Set containing a Map with a Set of nested Set and Map of objects", () => {
    const { nestedSet, nestedMap } = createNestedSetAndMap();

    const deepSet1 = new Set([nestedSet, nestedMap]);
    const map1 = new Map([["deep", deepSet1]]);
    const outerSet1 = new Set([map1]);

    const deepSet2 = new Set([
      new Set([{ foo: "bar" }, { baz: 42 }]),
      new Map([
        ["one", { a: 1 }],
        ["two", { b: 2 }],
      ]),
    ]);
    const map2 = new Map([["deep", deepSet2]]);
    const outerSet2 = new Set([map2]);

    expect(isEqual(outerSet1, outerSet2)).toBe(true);
  });

  it("Returns false if inner objects differ (deep inequality)", () => {
    const badNestedSet = new Set([{ foo: "bar" }, { baz: 999 }]); // 42 → 999
    const goodNestedMap = new Map([
      ["one", { a: 1 }],
      ["two", { b: 2 }],
    ]);

    const deepSet = new Set([badNestedSet, goodNestedMap]);
    const map = new Map([["data", deepSet]]);
    const correctNestedSet = new Set([{ foo: "bar" }, { baz: 42 }]);
    const set = new Set([
      correctNestedSet,
      new Map([
        ["one", { a: 1 }],
        ["two", { b: 2 }],
      ]),
    ]);
    const expected = new Map([["data", set]]);

    expect(isEqual(map, expected)).toBe(false);
  });
});
