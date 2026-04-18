import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (e) {
    console.warn(`Cache get failed for ${key}:`, e);
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.warn(`Cache set failed for ${key}:`, e);
  }
}

export async function cacheGetOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  console.log(`Cache MISS: ${key} — fetching fresh`);
  const fresh = await fetcher();

  if (fresh && (typeof fresh !== 'string' || fresh.length > 0)) {
    await cacheSet(key, fresh, ttlSeconds);
  }

  return fresh;
}

// Stale-while-revalidate: if fresh fetch fails, return stale cache
export async function cacheGetOrFetchWithFallback<T>(
  key: string,
  ttlSeconds: number,
  staleKey: string,
  staleTtlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  try {
    console.log(`Cache MISS: ${key} — fetching fresh`);
    const fresh = await fetcher();

    if (fresh && (typeof fresh !== 'string' || fresh.length > 0)) {
      // Save to both fresh cache (15min) and stale fallback (24h)
      await cacheSet(key, fresh, ttlSeconds);
      await cacheSet(staleKey, fresh, staleTtlSeconds);
      return fresh;
    }

    // Empty fresh response — try stale fallback
    const stale = await cacheGet<T>(staleKey);
    if (stale !== null) {
      console.log(`Fresh empty, using STALE: ${staleKey}`);
      return stale;
    }

    return fresh;
  } catch (e) {
    console.warn(`Fresh fetch failed for ${key}:`, e);
    // Try stale fallback
    const stale = await cacheGet<T>(staleKey);
    if (stale !== null) {
      console.log(`Fresh failed, using STALE: ${staleKey}`);
      return stale;
    }
    throw e;
  }
}
