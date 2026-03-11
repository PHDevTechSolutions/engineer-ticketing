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

messaging.onBackgroundMessage((payload) => {
  return showNotification(payload);
});

// Listener for generic Push events (iOS/Desktop)
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
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "engiConnect Alert";
  const options = {
    body: notification.body || data.body || "New update received.",
    icon: '/icons/disruptive.png',
    badge: '/icons/disruptive.png',
    tag: 'engi-alert', // Groups notifications
    renotify: true,    // Vibrate/Sound even if tag is the same
    requireInteraction: true,
    data: {
      url: data.url || '/dashboard'
    }
  };
  return self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});