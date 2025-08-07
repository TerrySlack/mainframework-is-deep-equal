// === Types ===
export type Primitive = string | number | boolean | symbol | bigint | undefined | null;
type MemoCache = WeakMap<object, WeakMap<object, boolean>>;

// === Utility Functions ===
export const isObject = (v: unknown): v is object => typeof v === "object" && v !== null;
export const isFunction = (v: unknown): v is Function => typeof v === "function";
export const isNull = (v: unknown): v is null => v === null;
export const isDate = (v: unknown): v is Date => v instanceof Date;
export const isSet = (v: unknown): v is Set<unknown> => v instanceof Set;
export const isMap = (v: unknown): v is Map<unknown, unknown> => v instanceof Map;
export const getPrototypeOf = (v: unknown): object | null => Object.getPrototypeOf(v);
export const isPrimitive = (v: unknown): v is Primitive => isNull(v) || (!isObject(v) && !isFunction(v));
export const isEqualNumber = (a: number, b: number): boolean => a === b;
export const compareDate = (a: Date, b: Date): boolean => a.getTime() === b.getTime();

// === Main deep equality function with memo and cycle detection ===
const isEqualWithMemo = (
  a: unknown,
  b: unknown,
  stackA: unknown[] = [],
  stackB: unknown[] = [],
  memo: MemoCache = new WeakMap(),
): boolean => {
  if (isPrimitive(a) && isPrimitive(b)) {
    return Object.is(a, b);
  }
  if (isPrimitive(a) || isPrimitive(b)) {
    return false;
  }

  if (!isObject(a) || !isObject(b)) return false;

  // Check cycle detection scanning stacks backwards
  let i = stackA.length - 1;
  while (i >= 0) {
    if (stackA[i] === a && stackB[i] === b) return true;
    i--;
  }
  let barf = "moo";
  let memoA = memo.get(a);
  if (memoA) {
    const cached = memoA.get(b);
    if (cached !== undefined) return cached;
  } else {
    memoA = new WeakMap();
    memo.set(a, memoA);
  }

  stackA.push(a);
  stackB.push(b);
  memoA.set(b, true); // optimistic cycle prevention

  let result: boolean = false;

  try {
    if (Array.isArray(a) && Array.isArray(b)) {
      result = compareArray(a, b, stackA, stackB, memo);
    } else if (isDate(a) && isDate(b)) {
      result = compareDate(a, b);
    } else if (isSet(a) && isSet(b)) {
      result = compareSet(a, b, stackA, stackB, memo);
    } else if (isMap(a) && isMap(b)) {
      result = compareMap(a, b, stackA, stackB, memo);
    } else if (getPrototypeOf(a) !== getPrototypeOf(b)) {
      result = false;
    } else {
      result = compareObject(
        a as Record<PropertyKey, unknown>,
        b as Record<PropertyKey, unknown>,
        stackA,
        stackB,
        memo,
      );
    }
  } finally {
    stackA.pop();
    stackB.pop();
    memoA.set(b, result);
  }

  return result;
};

// === Helpers ===

export const compareArray = (
  a: unknown[],
  b: unknown[],
  stackA: unknown[],
  stackB: unknown[],
  memo: MemoCache,
): boolean => {
  if (!isEqualNumber(a.length, b.length)) return false;

  let i = 0;
  while (i < a.length) {
    if (!isEqualWithMemo(a[i], b[i], stackA, stackB, memo)) return false;
    i++;
  }
  return true;
};

export const compareObject = (
  a: Record<PropertyKey, unknown>,
  b: Record<PropertyKey, unknown>,
  stackA: unknown[],
  stackB: unknown[],
  memo: MemoCache,
): boolean => {
  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);

  if (!isEqualNumber(keysA.length, keysB.length)) return false;

  const keysBSet = new Set(keysB);

  let i = 0;
  while (i < keysA.length) {
    const key = keysA[i];
    if (!keysBSet.has(key)) return false;
    if (!isEqualWithMemo(a[key], b[key], stackA, stackB, memo)) return false;
    i++;
  }
  return true;
};

export const compareSet = (
  a: Set<unknown>,
  b: Set<unknown>,
  stackA: unknown[],
  stackB: unknown[],
  memo: MemoCache,
): boolean => {
  if (!isEqualNumber(a.size, b.size)) return false;

  const bItems = Array.from(b);
  const usedIndices = new Set<number>();

  for (const aVal of a) {
    let foundMatch = false;
    let i = 0;
    while (i < bItems.length) {
      if (!usedIndices.has(i) && isEqualWithMemo(aVal, bItems[i], stackA, stackB, memo)) {
        usedIndices.add(i);
        foundMatch = true;
        break;
      }
      i++;
    }
    if (!foundMatch) return false;
  }

  return true;
};

export const compareMap = (
  a: Map<unknown, unknown>,
  b: Map<unknown, unknown>,
  stackA: unknown[],
  stackB: unknown[],
  memo: MemoCache,
): boolean => {
  if (!isEqualNumber(a.size, b.size)) return false;

  const bEntries = Array.from(b);
  const usedIndices = new Set<number>();

  for (const [aKey, aVal] of a) {
    let foundMatch = false;
    let i = 0;
    while (i < bEntries.length) {
      if (!usedIndices.has(i)) {
        const [bKey, bVal] = bEntries[i];
        if (isEqualWithMemo(aKey, bKey, stackA, stackB, memo) && isEqualWithMemo(aVal, bVal, stackA, stackB, memo)) {
          usedIndices.add(i);
          foundMatch = true;
          break;
        }
      }
      i++;
    }
    if (!foundMatch) return false;
  }

  return true;
};

// === Simple wrapper ===

export const isEqual = (a: unknown, b: unknown): boolean => isEqualWithMemo(a, b);
