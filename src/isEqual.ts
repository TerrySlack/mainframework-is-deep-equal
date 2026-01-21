// // === Types ===
export type Primitive = string | number | boolean | symbol | bigint | undefined | null;
export type MemoCache = WeakMap<object, WeakMap<object, boolean>>;

// === Configuration ===
export interface EqualityOptions {
  strictSparseArrays?: boolean;
  normalizeBoxedPrimitives?: boolean;
  allowPrototypeMismatch?: boolean;
}

// === Utility Functions ===
export const isObject = (v: unknown): v is object => typeof v === "object" && v !== null;
export const isFunction = (v: unknown): v is Function => typeof v === "function";
export const isDate = (v: unknown): v is Date => v instanceof Date;
export const isRegExp = (v: unknown): v is RegExp => v instanceof RegExp;
export const isSet = (v: unknown): v is Set<unknown> => v instanceof Set;
export const isMap = (v: unknown): v is Map<unknown, unknown> => v instanceof Map;
export const isBoxedPrimitive = (v: unknown): v is String | Number | Boolean => 
  v instanceof String || v instanceof Number || v instanceof Boolean;
export const isTypedArray = (v: unknown): v is ArrayBufferView => 
  ArrayBuffer.isView(v) && !(v instanceof DataView);
export const getPrototypeOf = (v: unknown): object | null => Object.getPrototypeOf(v);
export const isPrimitive = (v: unknown): v is Primitive => 
  v == null || (typeof v !== "object" && typeof v !== "function");

export const compareDate = (a: Date, b: Date) => a.getTime() === b.getTime();
export const compareRegExp = (a: RegExp, b: RegExp) => a.source === b.source && a.flags === b.flags;

// === Typed Array comparison ===
export const compareTypedArray = (a: ArrayBufferView, b: ArrayBufferView) => {
  if (a.constructor !== b.constructor || a.byteLength !== b.byteLength) return false;

  const aView = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const bView = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

  for (let i = 0; i < aView.length; i++) if (aView[i] !== bView[i]) return false;
  return true;
};

// === Set comparison ===
export const compareSet = (
  a: Set<unknown>,
  b: Set<unknown>,
  memo: MemoCache,
  opts: EqualityOptions
) => {
  if (a.size !== b.size) return false;

  const bArray = Array.from(b);
  const used = new Set<number>();

  for (const aVal of a) {
    const exactIdx = bArray.findIndex((bVal, idx) => !used.has(idx) && aVal === bVal);
    if (exactIdx !== -1) { used.add(exactIdx); continue; }

    let found = false;
    for (let i = 0; i < bArray.length; i++) {
      if (!used.has(i) && isEqualWithMemo(aVal, bArray[i], memo, opts)) {
        used.add(i);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }

  return true;
};

// === Map comparison ===
export const compareMap = (
  a: Map<unknown, unknown>,
  b: Map<unknown, unknown>,
  memo: MemoCache,
  opts: EqualityOptions
) => {
  if (a.size !== b.size) return false;

  const bEntries = Array.from(b);
  const used = new Set<number>();

  for (const [aKey, aVal] of a) {
    if (isPrimitive(aKey)) {
      const bVal = b.get(aKey);
      if (bVal === undefined && !b.has(aKey)) return false;
      if (!isEqualWithMemo(aVal, bVal, memo, opts)) return false;
      continue;
    }

    let found = false;
    for (let i = 0; i < bEntries.length; i++) {
      if (!used.has(i)) {
        const [bKey, bVal] = bEntries[i];
        if (isEqualWithMemo(aKey, bKey, memo, opts) && isEqualWithMemo(aVal, bVal, memo, opts)) {
          used.add(i);
          found = true;
          break;
        }
      }
    }
    if (!found) return false;
  }

  return true;
};

// === Array comparison ===
export const compareArray = (
  a: unknown[],
  b: unknown[],
  memo: MemoCache,
  opts: EqualityOptions
) => {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (opts.strictSparseArrays) {
      const aHas = Object.prototype.hasOwnProperty.call(a, i);
      const bHas = Object.prototype.hasOwnProperty.call(b, i);
      if (aHas !== bHas) return false;
      if (!aHas && !bHas) continue;
    }
    if (!isEqualWithMemo(a[i], b[i], memo, opts)) return false;
  }

  return true;
};

// === Object comparison ===
export const compareObject = (
  a: Record<PropertyKey, unknown>,
  b: Record<PropertyKey, unknown>,
  memo: MemoCache,
  opts: EqualityOptions
) => {
  let count = 0;
  for (const key of Reflect.ownKeys(a)) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isEqualWithMemo(a[key], b[key], memo, opts)) return false;
    count++;
  }
  if (Reflect.ownKeys(b).length !== count) return false;
  return true;
};

// === Main deep equality function ===
const isEqualWithMemo = (
  a: unknown,
  b: unknown,
  memo: MemoCache = new WeakMap(),
  opts: EqualityOptions = {}
): boolean => {
  // Fast path: reference equality
  if (a === b) return true;

  // Handle NaN case (NaN !== NaN but should be equal)
  if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) return true;

  // === Boxed primitive normalization first ===
  if (opts.normalizeBoxedPrimitives) {
    if (isBoxedPrimitive(a)) a = (a as any).valueOf();
    if (isBoxedPrimitive(b)) b = (b as any).valueOf();
    // If both are now primitives, compare immediately
    if (isPrimitive(a) && isPrimitive(b)) return a === b;
  }

  // Primitive check
  if (isPrimitive(a) || isPrimitive(b)) return false;

  // Functions - compare by reference only
  if (isFunction(a) || isFunction(b)) return a === b;

  // Objects must exist here
  if (!isObject(a) || !isObject(b)) return false;

  // Memoization for cycle detection
  let memoA = memo.get(a) ?? (() => { const m = new WeakMap(); memo.set(a, m); return m; })();
  const cached = memoA.get(b);
  if (cached !== undefined) return cached;

  // Optimistically assume equal for cycles
  memoA.set(b, true);

  const protoA = getPrototypeOf(a);
  const protoB = getPrototypeOf(b);

  let result: boolean;

  if (Array.isArray(a) && Array.isArray(b)) result = compareArray(a, b, memo, opts);
  else if (Array.isArray(a) || Array.isArray(b)) result = false;
  else if (isDate(a) && isDate(b)) result = compareDate(a, b);
  else if (isRegExp(a) && isRegExp(b)) result = compareRegExp(a, b);
  else if (isTypedArray(a) && isTypedArray(b)) result = compareTypedArray(a, b);
  else if (isSet(a) && isSet(b)) result = compareSet(a, b, memo, opts);
  else if (isMap(a) && isMap(b)) result = compareMap(a, b, memo, opts);
  else if (!opts.allowPrototypeMismatch && protoA !== protoB) result = false;
  else result = compareObject(a as Record<PropertyKey, unknown>, b as Record<PropertyKey, unknown>, memo, opts);

  memoA.set(b, result);
  return result;
};

// === Public API ===
export const isEqual = (a: unknown, b: unknown, opts?: EqualityOptions) => 
  isEqualWithMemo(a, b, new WeakMap(), opts);

export const isEqualWithSharedMemo = (
  a: unknown,
  b: unknown,
  memo: MemoCache,
  opts?: EqualityOptions
) => isEqualWithMemo(a, b, memo, opts);


