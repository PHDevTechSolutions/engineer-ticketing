import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "engiconnect-b15c6",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Ensure private key handles newlines correctly in production
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens, url } = await request.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens" }, { status: 400 });
    }

    const message: any = {
      notification: {
        title: title || "New Notification",
        body: body || "Update in EngiConnect",
      },
      data: {
        url: url || "/dashboard", // Dynamic URL from the frontend
      },
      tokens: tokens,
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
            "mutable-content": 1,
          },
        },
        headers: {
          "apns-priority": "10",
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

    // sendEachForMulticast handles the multi-token array perfectly
    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error("Push API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}