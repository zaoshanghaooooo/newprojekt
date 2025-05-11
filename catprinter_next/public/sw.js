// 缓存名称和版本
const CACHE_NAME = 'catprinter-cache-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 需要缓存的API路由
const API_ROUTES = [
  '/api/printers',
  '/api/settings'
];

// 安装Service Worker时缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // 立即激活
  self.skipWaiting();
});

// 激活Service Worker时清除旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 确保Service Worker立即接管页面
  return self.clients.claim();
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API请求处理策略：网络优先，失败时使用缓存
  if (url.pathname.startsWith('/api/')) {
    // 对需要缓存的API路由使用Network-first策略
    if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // 请求成功，克隆响应并缓存
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
            return response;
          })
          .catch(() => {
            // 网络请求失败，尝试从缓存获取
            console.log('[Service Worker] Fetching from cache:', url.pathname);
            return caches.match(event.request);
          })
      );
    } else {
      // 非缓存API路由使用网络请求
      event.respondWith(fetch(event.request));
    }
  } 
  // 对于静态资源，使用缓存优先策略
  else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // 如果在缓存中找到响应，则返回缓存
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 如果没有在缓存中找到，尝试从网络获取
        return fetch(event.request)
          .then((response) => {
            // 如果响应无效，直接返回
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 缓存新的响应
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
            
            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // 离线页面处理
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
  }
});

// 接收来自主线程的消息
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 缓存离线打印队列数据
  if (event.data && event.data.type === 'CACHE_OFFLINE_QUEUE') {
    const offlineData = event.data.payload;
    
    // 在IndexedDB中存储离线队列数据
    // 注意：这里需要使用IndexedDB API
    console.log('[Service Worker] Caching offline queue data');
  }
});

// 后台同步支持
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync event:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

// 同步离线队列
async function syncOfflineQueue() {
  console.log('[Service Worker] Syncing offline queue...');
  
  try {
    // 处理离线队列
    const response = await fetch('/api/print/offline-queue/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync offline queue');
    }
    
    const result = await response.json();
    console.log('[Service Worker] Offline queue sync result:', result);
    
    // 通知所有客户端同步完成
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETED',
        success: true,
        result
      });
    });
    
    return result;
  } catch (error) {
    console.error('[Service Worker] Offline queue sync failed:', error);
    
    // 通知所有客户端同步失败
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETED',
        success: false,
        error: error.message
      });
    });
    
    throw error;
  }
} 