import { Redis } from '@upstash/redis';

const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || '';
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

const hasRedis = !!(url && token);
console.log(`Redis initialized: ${hasRedis ? 'YES' : 'NO (missing env vars)'}`);

const redis = hasRedis
  ? new Redis({ url, token })
  : null;

function shouldCache<T>(value: T): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'string' && value.length === 0) return false;
  return true;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (e) {
    console.warn(`Cache get failed for ${key}:`, e);
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!redis) return;
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
  if (!redis) {
    console.log(`Cache SKIP (no redis): ${key}`);
    return fetcher();
  }

  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  console.log(`Cache MISS: ${key} — fetching fresh`);
  const fresh = await fetcher();

  if (shouldCache(fresh)) {
    await cacheSet(key, fresh, ttlSeconds);
  } else {
    console.log(`Cache SKIP save (empty/null result): ${key}`);
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
  if (!redis) {
    console.log(`Cache SKIP (no redis): ${key}`);
    return fetcher();
  }

  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  try {
    console.log(`Cache MISS: ${key} — fetching fresh`);
    const fresh = await fetcher();

    if (shouldCache(fresh)) {
      // Save to both fresh cache and stale fallback
      await cacheSet(key, fresh, ttlSeconds);
      await cacheSet(staleKey, fresh, staleTtlSeconds);
      return fresh;
    }

    console.log(`Cache SKIP save (empty/null result): ${key}`);

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
