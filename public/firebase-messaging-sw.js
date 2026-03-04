// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// !!! REPLACE THESE WITH YOUR ACTUAL FIREBASE PROJECT KEYS !!!
const firebaseConfig = {
  apiKey: "AIzaSyATdZZ6p4nUwM1fXGHOambj_jhLxbGc08k",
  authDomain: "engiconnect-b15c6.firebaseapp.com",
  projectId: "engiconnect-b15c6",
  storageBucket: "engiconnect-b15c6.firebasestorage.app",
  messagingSenderId: "238950711944",
  appId: "1:238950711944:web:f7879997e3441f569dd53d",
  measurementId: "G-03BP7P26PL"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background handler (Handles notifications when the app/browser is closed)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "EngiConnect Update";
  const notificationOptions = {
    body: payload.notification?.body || "New update received.",
    icon: '/icons/icon-192x192.png', // Ensure this file exists in /public
    badge: '/icons/icon-192x192.png',
    tag: 'drawing-alert',
    data: {
      url: '/dashboard'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click logic
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Logic to focus an existing tab or open a new window
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow(event.notification.data.url || '/dashboard');
    })
  );
});