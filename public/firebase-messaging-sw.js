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

// Handles FCM Background Messages
messaging.onBackgroundMessage((payload) => {
  return showNotification(payload);
});

// Handles Standard Web Push (VAPID)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      event.waitUntil(showNotification(payload));
    } catch (e) {
      console.error("Push parse error", e);
    }
  }
});

function showNotification(payload) {
  const title = payload.notification?.title || "EngiConnect Update";
  const options = {
    body: payload.notification?.body || "Tap to view details.",
    tag: 'drawing-alert', // Groups notifications
    renotify: true,       // Force vibration/sound every time
    data: {
      url: payload.data?.url || '/dashboard'
    }
  };
  return self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});