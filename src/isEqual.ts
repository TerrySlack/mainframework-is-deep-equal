export type Primitive = string | number | boolean | symbol | bigint | undefined | null;

type MemoState = -1 | 0 | 1;

export type MemoCache = WeakMap<object, WeakMap<object, MemoState>>;

export interface EqualityOptions {
  strictSparseArrays?: boolean;
  normalizeBoxedPrimitives?: boolean;
  allowPrototypeMismatch?: boolean;
}

const hasOwn = Object.prototype.hasOwnProperty;

// =====================================================
// FAST CHECKS
// =====================================================

const isObject = (v: unknown): v is object => v !== null && typeof v === "object";

const isArray = Array.isArray;

const isSet = (v: unknown): v is Set<unknown> => v instanceof Set;

const isMap = (v: unknown): v is Map<unknown, unknown> => v instanceof Map;

const isWeakSet = (v: unknown): v is WeakSet<object> => v instanceof WeakSet;

const isWeakMap = (v: unknown): v is WeakMap<object, unknown> => v instanceof WeakMap;

const isDate = (v: unknown): v is Date => v instanceof Date;

const isRegExp = (v: unknown): v is RegExp => v instanceof RegExp;

const isError = (v: unknown): v is Error => v instanceof Error;

const isPromise = (v: unknown): v is Promise<unknown> => v instanceof Promise;

const isArrayBuffer = (v: unknown): v is ArrayBuffer => v instanceof ArrayBuffer;

const isDataView = (v: unknown): v is DataView => v instanceof DataView;

const isTypedArray = (v: unknown): v is ArrayBufferView => ArrayBuffer.isView(v) && !isDataView(v);

const isBoxedPrimitive = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }

  const tag = Object.prototype.toString.call(v);

  return tag === "[object String]" || tag === "[object Number]" || tag === "[object Boolean]";
};

// =====================================================
// BUCKETING
// =====================================================

type BucketMap = Map<string, unknown[]>;

const shapeKey = (v: unknown): string => {
  if (v === null) return "p:null";

  switch (typeof v) {
    case "string":
      return "p:string";

    case "number":
      return "p:number";

    case "boolean":
      return "p:boolean";

    case "symbol":
      return "p:symbol";

    case "bigint":
      return "p:bigint";

    case "undefined":
      return "p:undefined";
  }

  if (isArray(v)) {
    return `arr:${v.length}`;
  }

  if (v instanceof Date) {
    return "date";
  }

  if (v instanceof RegExp) {
    return "regex";
  }

  if (v instanceof Set) {
    return `set:${v.size}`;
  }

  if (v instanceof Map) {
    return `map:${v.size}`;
  }

  if (ArrayBuffer.isView(v)) {
    return `typed:${(v as any).constructor.name}:${(v as any).byteLength}`;
  }

  if (v instanceof ArrayBuffer) {
    return `ab:${v.byteLength}`;
  }

  const ctor = (v as any)?.constructor?.name ?? "Object";

  const keys = Object.keys(v as object).length;

  return `obj:${ctor}:${keys}`;
};

const mapEntryShapeKey = (entry: [unknown, unknown]): string => `map-entry:${shapeKey(entry[0])}:${shapeKey(entry[1])}`;

const bucketizeMapEntries = (values: Iterable<[unknown, unknown]>): BucketMap => {
  const buckets = new Map<string, unknown[]>();

  for (const value of values) {
    const key = mapEntryShapeKey(value);

    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }

    bucket.push(value);
  }

  return buckets;
};
const bucketize = (values: Iterable<unknown>): BucketMap => {
  const buckets = new Map<string, unknown[]>();

  for (const value of values) {
    const key = shapeKey(value);

    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }

    bucket.push(value);
  }

  return buckets;
};
// =====================================================
// MEMO HELPERS
// =====================================================

const getPairMap = (memo: MemoCache, obj: object): WeakMap<object, MemoState> => {
  let map = memo.get(obj);

  if (!map) {
    map = new WeakMap<object, MemoState>();
    memo.set(obj, map);
  }

  return map;
};

const getMemoState = (memo: MemoCache, a: object, b: object): MemoState | undefined => memo.get(a)?.get(b);

const setMemoState = (memo: MemoCache, a: object, b: object, state: MemoState): void => {
  getPairMap(memo, a).set(b, state);
  getPairMap(memo, b).set(a, state);
};

const clearMemoState = (memo: MemoCache, a: object, b: object): void => {
  memo.get(a)?.delete(b);
  memo.get(b)?.delete(a);
};

// =====================================================
// NORMALIZATION
// =====================================================

const unbox = (value: unknown, other: unknown, opts: EqualityOptions): unknown => {
  if (opts.normalizeBoxedPrimitives && isBoxedPrimitive(value) && !isObject(other)) {
    return (value as any).valueOf();
  }

  return value;
};

// =====================================================
// SPECIAL COMPARISONS
// =====================================================

const compareDate = (a: Date, b: Date): boolean => Object.is(a.getTime(), b.getTime());

const compareRegExp = (a: RegExp, b: RegExp): boolean => a.source === b.source && a.flags === b.flags;

const SKIP_ERROR_KEYS = new Set(["name", "message", "cause"]);
const compareError = (a: Error, b: Error, memo: MemoCache, opts: EqualityOptions, cycle: { hits: number }): boolean => {
  if (a.name !== b.name || a.message !== b.message) return false;
  if (!isEqualWithMemo((a as any).cause, (b as any).cause, memo, opts, cycle)) return false;
  const aKeys = Object.keys(a).filter((k) => !SKIP_ERROR_KEYS.has(k));
  const bKeys = Object.keys(b).filter((k) => !SKIP_ERROR_KEYS.has(k));
  const aSyms = Object.getOwnPropertySymbols(a).filter((s) => Object.prototype.propertyIsEnumerable.call(a, s));
  const bSyms = Object.getOwnPropertySymbols(b).filter((s) => Object.prototype.propertyIsEnumerable.call(b, s));
  if (aKeys.length !== bKeys.length || aSyms.length !== bSyms.length) return false;
  for (const k of aKeys) {
    if (
      !hasOwn.call(b, k) ||
      !isEqualWithMemo((a as any)[k], (b as any)[k], memo, opts, cycle)
    )
      return false;
  }
  for (const k of aSyms) {
    if (
      !hasOwn.call(b, k) ||
      !isEqualWithMemo((a as any)[k], (b as any)[k], memo, opts, cycle)
    )
      return false;
  }
  return true;
};

// Preconditions (callers must enforce):
//   a.byteLength === b.byteLength
//   a.byteOffset % 8 === 0 && b.byteOffset % 8 === 0
const compareBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  const len = a.byteLength;
  const chunks = Math.floor(len / 8);
  const a64 = new BigUint64Array(a.buffer, a.byteOffset, chunks);
  const b64 = new BigUint64Array(b.buffer, b.byteOffset, chunks);

  let i = 0;
  while (i < chunks) {
    if (a64[i] !== b64[i]) return false;
    i++;
  }

  i = chunks * 8; // start of tail bytes after 64-bit chunks
  while (i < len) {
    if (a[i] !== b[i]) return false;
    i++;
  }
  return true;
};

const isDetachedArrayBuffer = (buffer: ArrayBufferLike): boolean =>
  buffer instanceof ArrayBuffer && buffer.detached;

const compareArrayBuffer = (a: ArrayBuffer, b: ArrayBuffer): boolean => {
  if (a.detached || b.detached) {
    return false;
  }

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  return compareBytes(new Uint8Array(a), new Uint8Array(b));
};

const compareDataView = (a: DataView, b: DataView): boolean => {
  if (isDetachedArrayBuffer(a.buffer) || isDetachedArrayBuffer(b.buffer)) {
    return false;
  }

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const va = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const vb = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

  if (a.byteOffset % 8 === 0 && b.byteOffset % 8 === 0) {
    return compareBytes(va, vb);
  }

  let i = 0;
  const len = va.length;

  while (i < len) {
    if (va[i] !== vb[i]) return false;
    i++;
  }

  return true;
};

const compareTypedArray = (a: ArrayBufferView, b: ArrayBufferView): boolean => {
  if (isDetachedArrayBuffer(a.buffer) || isDetachedArrayBuffer(b.buffer)) {
    return false;
  }

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const av = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const bv = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

  if (a.byteOffset % 8 === 0 && b.byteOffset % 8 === 0) {
    return compareBytes(av, bv);
  }

  let i = 0;
  const len = av.length;

  while (i < len) {
    if (av[i] !== bv[i]) return false;
    i++;
  }

  return true;
};

// =====================================================
// SET
// =====================================================

const compareSet = (a: Set<unknown>, b: Set<unknown>, memo: MemoCache, opts: EqualityOptions, cycle: { hits: number }): boolean => {
  if (a.size !== b.size) {
    return false;
  }

  const aBuckets = bucketize(a);

  const bBuckets = bucketize(b);

  if (aBuckets.size !== bBuckets.size) {
    return false;
  }

  for (const [key, aBucket] of aBuckets) {
    const bBucket = bBuckets.get(key);

    if (!bBucket) {
      return false;
    }

    if (aBucket.length !== bBucket.length) {
      return false;
    }

    const used = new Uint8Array(bBucket.length);

    outer: for (const av of aBucket) {
      let i = 0;
      const len = bBucket.length;

      while (i < len) {
        if (!used[i]) {
          if (isEqualWithMemo(av, bBucket[i], memo, opts, cycle)) {
            used[i] = 1;
            continue outer;
          }
        }

        i++;
      }

      return false;
    }
  }

  return true;
};

// =====================================================
// MAP
// =====================================================

const compareMap = (
  a: Map<unknown, unknown>,
  b: Map<unknown, unknown>,
  memo: MemoCache,
  opts: EqualityOptions,
  cycle: { hits: number },
): boolean => {
  if (a.size !== b.size) {
    return false;
  }

  const aBuckets = bucketizeMapEntries(a.entries());

  const bBuckets = bucketizeMapEntries(b.entries());

  if (aBuckets.size !== bBuckets.size) {
    return false;
  }

  for (const [key, aBucket] of aBuckets) {
    const bBucket = bBuckets.get(key);

    if (!bBucket) {
      return false;
    }

    if (aBucket.length !== bBucket.length) {
      return false;
    }

    const used = new Uint8Array(bBucket.length);

    outer: for (const entryA of aBucket) {
      const [ak, av] = entryA as [unknown, unknown];

      let i = 0;
      const len = bBucket.length;

      while (i < len) {
        if (!used[i]) {
          const [bk, bv] = bBucket[i] as [unknown, unknown];

          if (isEqualWithMemo(ak, bk, memo, opts, cycle) && isEqualWithMemo(av, bv, memo, opts, cycle)) {
            used[i] = 1;
            continue outer;
          }
        }

        i++;
      }
      return false;
    }
  }

  return true;
};

// =====================================================
// CORE
// =====================================================

const finishComparison = (
  memo: MemoCache,
  a: object,
  b: object,
  result: boolean,
  cycle: { hits: number },
  startHits: number,
): boolean => {
  if (!result) {
    setMemoState(memo, a, b, -1);
  } else if (cycle.hits === startHits) {
    setMemoState(memo, a, b, 1);
  } else {
    clearMemoState(memo, a, b);
  }

  return result;
};

const EMPTY_OPTS: EqualityOptions = {};

const isEqualWithMemo = (
  a: unknown,
  b: unknown,
  memo: MemoCache,
  opts: EqualityOptions,
  cycle: { hits: number },
): boolean => {
  a = unbox(a, b, opts);
  b = unbox(b, a, opts);

  if (typeof a === "number" && typeof b === "number") {
    return Object.is(a, b);
  }

  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (!isObject(a) || !isObject(b)) {
    return false;
  }

  if (isWeakMap(a) || isWeakMap(b) || isWeakSet(a) || isWeakSet(b)) {
    return false;
  }

  if (isPromise(a) || isPromise(b)) {
    return false;
  }

  const cached = getMemoState(memo, a, b);

  if (cached === 1) {
    return true;
  }

  if (cached === -1) {
    return false;
  }

  // Cycle detected: optimistically assume equal to break recursion.
  // Note: structurally non-isomorphic cycles (e.g. 2-node cycle vs self-loop)
  // may incorrectly return true. This is a known limitation.
  if (cached === 0) {
    cycle.hits++;
    return true;
  }

  setMemoState(memo, a, b, 0);
  const startHits = cycle.hits;

  if (!opts.allowPrototypeMismatch && a.constructor !== b.constructor) {
    return finishComparison(memo, a, b, false, cycle, startHits);
  }

  if (isBoxedPrimitive(a) && isBoxedPrimitive(b)) {
    const x = (a as { valueOf(): unknown }).valueOf();
    const y = (b as { valueOf(): unknown }).valueOf();

    if (typeof x === "number" || typeof y === "number") {
      if (!Object.is(x, y)) {
        return finishComparison(memo, a, b, false, cycle, startHits);
      }
    } else if (x !== y) {
      return finishComparison(memo, a, b, false, cycle, startHits);
    }
  }

  if (isDate(a) && isDate(b)) {
    return finishComparison(memo, a, b, compareDate(a, b), cycle, startHits);
  }

  if (isRegExp(a) && isRegExp(b)) {
    return finishComparison(memo, a, b, compareRegExp(a, b), cycle, startHits);
  }

  if (isError(a) && isError(b)) {
    return finishComparison(memo, a, b, compareError(a, b, memo, opts, cycle), cycle, startHits);
  }

  if (isArrayBuffer(a) && isArrayBuffer(b)) {
    return finishComparison(memo, a, b, compareArrayBuffer(a, b), cycle, startHits);
  }

  if (isDataView(a) && isDataView(b)) {
    return finishComparison(memo, a, b, compareDataView(a, b), cycle, startHits);
  }

  if (isTypedArray(a) && isTypedArray(b)) {
    return finishComparison(memo, a, b, compareTypedArray(a, b), cycle, startHits);
  }

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) {
      return finishComparison(memo, a, b, false, cycle, startHits);
    }

    let i = 0;
    const len = a.length;
    const strict = opts.strictSparseArrays;

    while (i < len) {
      if (strict) {
        const ah = hasOwn.call(a, i);
        const bh = hasOwn.call(b, i);

        if (ah !== bh) {
          return finishComparison(memo, a, b, false, cycle, startHits);
        }

        if (!ah) {
          i++;
          continue;
        }
      }

      if (!isEqualWithMemo(a[i], b[i], memo, opts, cycle)) {
        return finishComparison(memo, a, b, false, cycle, startHits);
      }

      i++;
    }

    return finishComparison(memo, a, b, true, cycle, startHits);
  }

  if (isSet(a) && isSet(b)) {
    return finishComparison(memo, a, b, compareSet(a, b, memo, opts, cycle), cycle, startHits);
  }

  if (isMap(a) && isMap(b)) {
    return finishComparison(memo, a, b, compareMap(a, b, memo, opts, cycle), cycle, startHits);
  }

  const aStringKeys = Object.keys(a); // enumerable-only
  const bStringKeys = Object.keys(b); // enumerable-only
  const aSyms = Object.getOwnPropertySymbols(a).filter((s) => Object.prototype.propertyIsEnumerable.call(a, s));
  const bSyms = Object.getOwnPropertySymbols(b).filter((s) => Object.prototype.propertyIsEnumerable.call(b, s));
  const hasSymbols = aSyms.length > 0 || bSyms.length > 0;
  const aKeys: (string | symbol)[] = hasSymbols ? (aStringKeys as (string | symbol)[]).concat(aSyms) : aStringKeys;
  const bKeys: (string | symbol)[] = hasSymbols ? (bStringKeys as (string | symbol)[]).concat(bSyms) : bStringKeys;
  const aProto = Object.getPrototypeOf(a);
  const bProto = Object.getPrototypeOf(b);

  // Second prototype check: catches objects where .constructor is an own property
  // that shadows the inherited one, which the a.constructor !== b.constructor
  // check above does not cover when allowPrototypeMismatch is false.
  if (!opts.allowPrototypeMismatch) {
    if (aProto !== bProto) {
      return finishComparison(memo, a, b, false, cycle, startHits);
    }
  }

  if (aKeys.length !== bKeys.length) {
    return finishComparison(memo, a, b, false, cycle, startHits);
  }

  for (const key of aKeys) {
    if (!hasOwn.call(b, key)) {
      return finishComparison(memo, a, b, false, cycle, startHits);
    }

    if (!isEqualWithMemo((a as any)[key], (b as any)[key], memo, opts, cycle)) {
      return finishComparison(memo, a, b, false, cycle, startHits);
    }
  }

  return finishComparison(memo, a, b, true, cycle, startHits);
};

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Performs a deep equality check between two values.
 *
 * **Cyclic structures:** Cycles are detected via a memo cache. When a cycle is
 * encountered, the comparison optimistically returns `true` to break recursion.
 * As a known limitation, structurally non-isomorphic cycles (e.g. a two-node
 * mutual reference vs. a self-loop) may incorrectly compare as equal.
 */
export const isEqual = (a: unknown, b: unknown, opts?: EqualityOptions): boolean =>
  isEqualWithMemo(a, b, new WeakMap(), opts ?? EMPTY_OPTS, { hits: 0 });
