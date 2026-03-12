import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Ensures Vercel treats this as a real-time API

const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    // Vercel handling for Private Key
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "engiconnect-b15c6",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error: any) {
    console.error("Firebase Admin Init Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens, url } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens provided" }, { status: 400 });
    }

    const message = {
      notification: { title, body },
      data: { 
        url: url || "/",
        click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard practice for web/mobile routing
      },
      tokens: tokens,
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          body: body,
          icon: "/icons/icon-192x192.png", // Ensure this path exists in your public folder
          badge: "/icons/badge-72x72.png",
          requireInteraction: true,
        },
        fcm_options: {
          link: url || "/",
        },
      },
    };

    // Await the multicast send
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`Push Sent: ${response.successCount} success, ${response.failureCount} failure`);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err: any) {
    console.error("Push API Fatal Error:", err.message);
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, { status: 500 });
  }
}