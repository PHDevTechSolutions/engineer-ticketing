importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

// Background handler
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received', payload);

  const notificationTitle = payload.notification?.title || "New Drawing Request";
  const notificationOptions = {
    body: payload.notification?.body || "A new shop drawing requires your review.",
    icon: '/icons/icon-192x192.png', 
    badge: '/icons/icon-192x192.png',
    // 'tag' groups similar notifications so they don't clutter the lock screen
    tag: 'drawing-alert', 
    renotify: true,
    data: {
      // Dynamic URL: If the payload sends a specific link, go there, else dashboard
      url: payload.data?.url || '/dashboard'
    },
    // Adding 'actions' allows users to jump straight to the request from the lock screen
    actions: [
      { action: 'open', title: 'View Request' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click logic for iOS/Android
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If a tab is already open, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});