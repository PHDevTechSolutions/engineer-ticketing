import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      console.warn("⚠️ Firebase Admin credentials missing from .env");
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "engiconnect-b15c6",
          clientEmail: clientEmail,
          // The regex handles both actual newlines and the string version \n from .env
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("✅ Firebase Admin Initialized");
    }
  } catch (error: any) {
    console.error("❌ Firebase Admin Initialization Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens, url } = await request.json();

    // Basic validation
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens provided" }, { status: 400 });
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: title || "New Notification",
        body: body || "Update in EngiConnect",
      },
      data: {
        url: url || "/dashboard",
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
          // 'priority' is the correct key here, or you can omit it 
          // as 'priority: high' at the top level handles most cases
          channelId: "default", 
        },
      },
    };

    // sendEachForMulticast is the modern way to send to multiple tokens
    const response = await admin.messaging().sendEachForMulticast(message);

    // Filter out invalid/expired tokens for your logs
    if (response.failureCount > 0) {
      const failedTokens: any[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: tokens[idx],
            error: resp.error,
          });
        }
      });
      console.log("Failed tokens detail:", failedTokens);
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error("Push API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}