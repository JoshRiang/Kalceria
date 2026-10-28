function hashSeed(seed) {
  const value = String(seed);
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

let fallbackRuntimeSeed = 0;

export function createSeededRandom(seed) {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRuntimeSeededRandom(namespace) {
  const entropy = new Uint32Array(2);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(entropy);
  } else {
    entropy[0] = Date.now() >>> 0;
    entropy[1] = ++fallbackRuntimeSeed;
  }

  return createSeededRandom(`${namespace}:${entropy[0]}:${entropy[1]}`);
}
