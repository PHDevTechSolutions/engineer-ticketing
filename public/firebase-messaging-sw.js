// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configured for your Main Project (engiconnect-b15c6)
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

/**
 * Background message handler:
 * This runs when the app is minimized, the tab is closed, or the screen is OFF.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received', payload);

  const notificationTitle = payload.notification?.title || "New Drawing Request";
  const notificationOptions = {
    body: payload.notification?.body || "A new shop drawing requires your review.",
    // Removed specific icon paths to avoid 404/silent failures
    // The browser will use the default PWA/Site icon instead
    tag: 'drawing-alert', 
    renotify: true, // Forces phone to vibrate/sound even if a previous alert is still on screen
    data: {
      url: payload.data?.url || '/dashboard'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Notification click handler:
 * Ensures the user is taken to the correct page when they tap the alert.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If the dashboard is already open in a tab, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If no tab is open, open a new window to the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});