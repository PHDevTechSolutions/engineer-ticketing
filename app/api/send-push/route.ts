import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "engiconnect-b15c6",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens } = await request.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens" }, { status: 400 });
    }

    const message: any = {
      notification: {
        title: title || "New Notification",
        body: body || "Update in EngiConnect",
      },
      data: {
        url: "/request/shop-drawing",
      },
      tokens: tokens,
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1, // Critical for background wake-up
            "mutable-content": 1,   // Allows Service Worker to modify alert
          },
        },
        headers: {
          "apns-priority": "10",     // High priority to bypass battery saving
          "apns-push-type": "alert",
        },
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          defaultSound: true,
          notificationPriority: "priority_max",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}