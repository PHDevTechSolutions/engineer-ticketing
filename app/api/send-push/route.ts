import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "engiconnect-b15c6",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens provided" });
    }

    const message = {
      notification: { title, body },
      data: { url: "/request/shop-drawing" },
      tokens: tokens, // Array of recipient FCM tokens
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true, // Required to wake up iOS in background
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({ 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount 
    });
  } catch (error: any) {
    console.error("Push Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}