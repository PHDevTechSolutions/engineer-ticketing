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

// Background listener for Firebase messages
messaging.onBackgroundMessage((payload) => {
  return showNotification(payload);
});

// Universal "Push" listener for iOS and Desktop
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
  const title = payload.notification?.title || payload.title || "engiConnect Alert";
  const options = {
    body: payload.notification?.body || payload.body || "Tap to see the latest update.",
    icon: '/icons/disruptive.png', // Your custom brand icon
    badge: '/icons/disruptive.png', 
    tag: 'engi-alert', 
    renotify: true,
    data: {
      url: payload.data?.url || payload.url || '/dashboard'
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