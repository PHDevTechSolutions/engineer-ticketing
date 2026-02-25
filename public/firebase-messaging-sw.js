importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Paste your ACTUAL Main Project config here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 2. This handles the notification when the app is CLOSED or in the background
messaging.onBackgroundMessage((payload) => {
  console.log('[engiconnect] Background Message:', payload);
  
  const notificationTitle = payload.notification.title || "engiconnect Update";
  const notificationOptions = {
    body: payload.notification.body || "New drawing request received.",
    icon: '/icons/disruptive.png',
    badge: '/icons/disruptive.png', // Small icon for the phone's status bar
    tag: 'drawing-alert', // Prevents multiple notifications from stacking up
    data: {
      url: '/dashboard' // Where to send the user when they tap
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. The "Action" logic: Opens the app when the user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification popup

  // This tells the phone to open your app and go to the dashboard
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, just focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If the app is closed, open it to the dashboard
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});