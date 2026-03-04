// @/lib/push-subscription.ts

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  const registration = await navigator.serviceWorker.ready;
  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!publicVapidKey) return null;

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });
  } catch (error) {
    console.error("Push Manager subscription failed:", error);
    return null;
  }
}