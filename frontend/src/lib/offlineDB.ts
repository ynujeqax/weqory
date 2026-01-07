/**
 * IndexedDB wrapper for offline data persistence
 * Stores watchlist, alerts, and market data for offline access
 */

const DB_NAME = 'weqory-offline'
const DB_VERSION = 1

interface DBSchema {
  watchlist: {
    key: number
    value: unknown
  }
  alerts: {
    key: string
    value: unknown
  }
  coins: {
    key: string
    value: unknown
  }
  market: {
    key: string
    value: unknown
  }
  'pending-mutations': {
    key: number
    value: PendingMutation
  }
}

export interface PendingMutation {
  id?: number
  type: 'create-alert' | 'delete-alert' | 'add-watchlist' | 'remove-watchlist'
  data: unknown
  timestamp: number
}

type StoreName = keyof DBSchema

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Watchlist store
      if (!db.objectStoreNames.contains('watchlist')) {
        db.createObjectStore('watchlist', { keyPath: 'id' })
      }

      // Alerts store
      if (!db.objectStoreNames.contains('alerts')) {
        db.createObjectStore('alerts', { keyPath: 'id' })
      }

      // Coins store (for offline coin search)
      if (!db.objectStoreNames.contains('coins')) {
        const coinsStore = db.createObjectStore('coins', { keyPath: 'symbol' })
        coinsStore.createIndex('by-name', 'name', { unique: false })
      }

      // Market data store
      if (!db.objectStoreNames.contains('market')) {
        db.createObjectStore('market', { keyPath: 'key' })
      }

      // Pending mutations for background sync
      if (!db.objectStoreNames.contains('pending-mutations')) {
        db.createObjectStore('pending-mutations', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Generic get all from store
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as T[])
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to get all from ${storeName}:`, error)
    return []
  }
}

// Generic get by key
export async function get<T>(storeName: StoreName, key: string | number): Promise<T | undefined> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as T | undefined)
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to get from ${storeName}:`, error)
    return undefined
  }
}

// Generic put (add or update)
export async function put<T>(storeName: StoreName, value: T): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.put(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to put in ${storeName}:`, error)
  }
}

// Generic put many
export async function putMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return

  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)

      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()

      for (const value of values) {
        store.put(value)
      }
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to put many in ${storeName}:`, error)
  }
}

// Generic delete
export async function remove(storeName: StoreName, key: string | number): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to delete from ${storeName}:`, error)
  }
}

// Clear a store
export async function clear(storeName: StoreName): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`[OfflineDB] Failed to clear ${storeName}:`, error)
  }
}

// Add pending mutation for background sync
export async function addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp'>): Promise<void> {
  const fullMutation: PendingMutation = {
    ...mutation,
    timestamp: Date.now(),
  }
  await put('pending-mutations', fullMutation)

  // Try to trigger background sync if available
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      // Background sync may not be supported in all browsers
      if ('sync' in registration) {
        const syncManager = (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync
        if (mutation.type.includes('alert')) {
          await syncManager.register('sync-alerts')
        } else {
          await syncManager.register('sync-watchlist')
        }
      }
    } catch (error) {
      console.warn('[OfflineDB] Background sync not available:', error)
    }
  }
}

// Get all pending mutations
export async function getPendingMutations(): Promise<PendingMutation[]> {
  return getAll<PendingMutation>('pending-mutations')
}

// Clear pending mutation after successful sync
export async function clearPendingMutation(id: number): Promise<void> {
  await remove('pending-mutations', id)
}

// Convenience methods for specific stores
export const offlineDB = {
  // Watchlist
  async getWatchlist<T>(): Promise<T[]> {
    return getAll<T>('watchlist')
  },
  async saveWatchlist<T>(items: T[]): Promise<void> {
    await clear('watchlist')
    await putMany('watchlist', items)
  },

  // Alerts
  async getAlerts<T>(): Promise<T[]> {
    return getAll<T>('alerts')
  },
  async saveAlerts<T>(alerts: T[]): Promise<void> {
    await clear('alerts')
    await putMany('alerts', alerts)
  },

  // Coins
  async getCoins<T>(): Promise<T[]> {
    return getAll<T>('coins')
  },
  async saveCoins<T>(coins: T[]): Promise<void> {
    await clear('coins')
    await putMany('coins', coins)
  },

  // Market data
  async getMarketData<T>(key: string): Promise<T | undefined> {
    return get<T>('market', key)
  },
  async saveMarketData<T extends { key: string }>(data: T): Promise<void> {
    await put('market', data)
  },

  // Pending mutations
  addPendingMutation,
  getPendingMutations,
  clearPendingMutation,
}
