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

// In-memory cache for deduplication (service worker scope)
const recentNotifications = new Map();
const NOTIFICATION_TTL = 10 * 60 * 1000; // 10 minutes

// Create a fingerprint for deduplication (title + body + 5-minute window)
function createFingerprint(title, body) {
  const timeWindow = Math.floor(Date.now() / (1000 * 60 * 5)); // 5-minute window
  return `${title}|${body}|${timeWindow}`;
}

// Check and mark notification as seen
function isDuplicate(fingerprint) {
  const now = Date.now();
  
  // Cleanup old entries
  for (const [key, timestamp] of recentNotifications) {
    if (now - timestamp > NOTIFICATION_TTL) {
      recentNotifications.delete(key);
    }
  }
  
  if (recentNotifications.has(fingerprint)) {
    console.log('[SW] Duplicate notification suppressed:', fingerprint);
    return true;
  }
  
  recentNotifications.set(fingerprint, now);
  return false;
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
  
  // Check for duplicates
  if (isDuplicate(fingerprint)) {
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