import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported, Messaging } from "firebase/messaging";

const mainConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const logsConfig = {
  apiKey: process.env.NEXT_PUBLIC_LOGS_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_LOGS_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_LOGS_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_LOGS_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_LOGS_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_LOGS_FIREBASE_APP_ID,
};

// Initialize Apps
const mainApp = !getApps().length ? initializeApp(mainConfig) : getApp();
const logsApp = !getApps().find(app => app.name === "logsApp") 
  ? initializeApp(logsConfig, "logsApp") 
  : getApp("logsApp");

export const db = getFirestore(mainApp);
export const storage = getStorage(mainApp);
export const logsDb = getFirestore(logsApp);

// Safe Messaging Export
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getMessaging(mainApp);
  }
  return null;
};