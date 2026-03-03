export interface MockOptions {
  seed?: string;
  fixedNowIso?: string;
}

export function mockNow(fixedNowIso?: string): Date {
  return fixedNowIso ? new Date(fixedNowIso) : new Date();
}

export function seededRandom(seed: string): () => number {
  let state = hash32(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hash32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
