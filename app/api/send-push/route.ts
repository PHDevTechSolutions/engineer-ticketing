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
        body: body || "You have a new update in EngiConnect.",
      },
      data: {
        url: "/request/shop-drawing",
      },
      tokens: tokens,
      // CRITICAL FOR iOS BACKGROUND/LOCK SCREEN
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            // 'content-available': 1 is the key for background wake-up
            "content-available": 1,
            mutableContent: true,
          },
        },
        headers: {
          // '10' is High Priority. This wakes the screen immediately.
          "apns-priority": "10",
          "apns-push-type": "alert",
          "apns-topic": "com.engiconnect.app", // Use your bundle ID or delete this line
        },
      },
      // Settings for Android devices
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "OPEN_ACTIVITY_1",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}