export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Retrieves an item from cache if present and not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores an item with a time-to-live (TTL) in milliseconds
   */
  public set<T>(key: string, value: T, ttlMs: number = 60 * 60 * 1000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Deletes a specific cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries matching a prefix
   */
  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache
   */
  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const globalCache = new MemoryCacheService();
