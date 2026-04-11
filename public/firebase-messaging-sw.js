importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// NOTE: Firebase config is intentionally in the service worker (public by nature).
// Protect your project via Firebase Security Rules, not by hiding this config.
const firebaseConfig = {
  apiKey: "AIzaSyATdZZ6p4nUwM1fXGHOambj_jhLxbGc08k",
  authDomain: "engiconnect-b15c6.firebaseapp.com",
  projectId: "engiconnect-b15c6",
  storageBucket: "engiconnect-b15c6.firebasestorage.app",
  messagingSenderId: "238950711944",
  appId: "1:238950711944:web:f7879997e3441f569dd53d"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const DB_NAME = 'notification-dedup';
const STORE_NAME = 'seen';
const NOTIFICATION_TTL = 10 * 60 * 1000; // 10 minutes

// Create a fingerprint for deduplication (title + body only - no time window for exact match)
function createFingerprint(title, body) {
  return `${title}|${body}`;
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fingerprint' });
      }
    };
  });
}

// Check if notification is duplicate
async function isDuplicate(fingerprint) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const existing = await new Promise((resolve) => {
      const req = store.get(fingerprint);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    
    const now = Date.now();
    
    // Cleanup old entries
    const all = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });
    
    for (const item of all) {
      if (now - item.timestamp > NOTIFICATION_TTL) {
        store.delete(item.fingerprint);
      }
    }
    
    if (existing) {
      console.log('[SW] Duplicate suppressed:', fingerprint.substring(0, 50));
      db.close();
      return true;
    }
    
    // Mark as seen
    store.put({ fingerprint, timestamp: now });
    db.close();
    return false;
  } catch (e) {
    console.error('[SW] Deduplication error:', e);
    return false; // Fail open - show notification
  }
}

// Handle background messages via FCM
messaging.onBackgroundMessage((payload) => {
  return showNotification(payload);
});

// Handle raw Push API events (iOS Safari, some Android browsers)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(showNotification(payload));
  } catch (e) {
    console.error("Push parse error", e);
  }
});

async function showNotification(payload) {
  const notification = payload.notification || {};
  const data         = payload.data || {};

  const title = notification.title || data.title || "DSI Connect";
  const body = notification.body || data.body || "You have a new update.";
  
  // Create unique tag based on content for deduplication
  const fingerprint = createFingerprint(title, body);
  const messageId = payload.messageId || payload.fcmMessageId || fingerprint;
  
  // Check for duplicates (must await the async function)
  const duplicate = await isDuplicate(fingerprint);
  if (duplicate) {
    console.log('[SW] Notification suppressed (duplicate):', title);
    return;
  }
  
  const options = {
    body:               body,
    icon:               '/icons/disruptive.png',
    badge:              '/icons/disruptive.png',
    tag:                messageId,  // Unique tag per notification content
    requireInteraction: true,
    data: {
      url: data.url || '/dashboard',
      fingerprint: fingerprint
    }
  };

  return self.registration.showNotification(title, options);
}

// Navigate to the relevant page when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if already open
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});