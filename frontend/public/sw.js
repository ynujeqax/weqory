// Service Worker for Weqory PWA
const CACHE_VERSION = 2
const STATIC_CACHE = `weqory-static-v${CACHE_VERSION}`
const DYNAMIC_CACHE = `weqory-dynamic-v${CACHE_VERSION}`
const API_CACHE = `weqory-api-v${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/v1/users/me',
  '/api/v1/watchlist',
  '/api/v1/alerts',
  '/api/v1/coins',
  '/api/v1/market',
]

// Cache duration for API responses (5 minutes)
const API_CACHE_DURATION = 5 * 60 * 1000

// Network timeout before falling back to cache
const NETWORK_TIMEOUT = 3000

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('weqory-') &&
                   name !== STATIC_CACHE &&
                   name !== DYNAMIC_CACHE &&
                   name !== API_CACHE
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip WebSocket and extension requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.protocol === 'chrome-extension:') {
    return
  }

  // Skip Telegram scripts
  if (url.hostname === 'telegram.org') {
    return
  }

  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE))
    return
  }

  // Static assets - Stale while revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // HTML navigation - Network first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOffline(request))
    return
  }

  // Dynamic content - Network first with cache
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE))
})

// Network first with cache fallback (with timeout)
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ])

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url)
      return cachedResponse
    }
    throw error
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}

// Network first with offline page fallback
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
      )
    ])

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Try to serve cached page
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Serve offline page
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) {
      return offlinePage
    }

    // Last resort - return basic offline response
    return new Response('You are offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Check if request is for static asset
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
         pathname === '/manifest.json'
}

// Background sync for pending mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncPendingAlerts())
  }
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncPendingWatchlist())
  }
})

async function syncPendingAlerts() {
  try {
    const pendingAlerts = await getPendingFromIDB('pending-alerts')
    for (const alert of pendingAlerts) {
      await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert.data)
      })
      await removeFromIDB('pending-alerts', alert.id)
    }
  } catch (error) {
    console.error('[SW] Failed to sync alerts:', error)
  }
}

async function syncPendingWatchlist() {
  try {
    const pendingItems = await getPendingFromIDB('pending-watchlist')
    for (const item of pendingItems) {
      await fetch('/api/v1/watchlist', {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      })
      await removeFromIDB('pending-watchlist', item.id)
    }
  } catch (error) {
    console.error('[SW] Failed to sync watchlist:', error)
  }
}

// IndexedDB helpers for background sync
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('weqory-offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pending-alerts')) {
        db.createObjectStore('pending-alerts', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('pending-watchlist')) {
        db.createObjectStore('pending-watchlist', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

async function getPendingFromIDB(storeName) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function removeFromIDB(storeName, id) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
