import { Injectable } from '@nestjs/common'
import type { CachedResult } from '../types/market.types'

interface CacheEntry<T> {
  value: T
  updatedAt: string
  expiresAt: number
}

@Injectable()
export class MarketCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>()

  async getOrSet<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<CachedResult<T>> {
    const cached = this.store.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    if (cached && cached.expiresAt > now) {
      return { value: cached.value, updatedAt: cached.updatedAt, cached: true }
    }

    const value = await load()
    const updatedAt = new Date().toISOString()
    this.store.set(key, { value, updatedAt, expiresAt: now + ttlMs })

    return { value, updatedAt, cached: false }
  }

  get<T>(key: string): CachedResult<T> | null {
    const cached = this.store.get(key) as CacheEntry<T> | undefined

    if (!cached || cached.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }

    return { value: cached.value, updatedAt: cached.updatedAt, cached: true }
  }

  set<T>(key: string, value: T, ttlMs: number): CachedResult<T> {
    const updatedAt = new Date().toISOString()
    this.store.set(key, { value, updatedAt, expiresAt: Date.now() + ttlMs })

    return { value, updatedAt, cached: false }
  }

  delete(key: string): void {
    this.store.delete(key)
  }
}
