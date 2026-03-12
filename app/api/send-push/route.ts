import { NextResponse } from "next/server";

export const runtime = 'nodejs';

// Use require for the server-side SDK
const admin = require("firebase-admin");

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
    console.error("Firebase Admin Init Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens, url } = await request.json();

    const message = {
      notification: { title, body },
      data: { url: url || "/" },
      tokens: tokens, // This is the array of 2 tokens your UI found
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
    };

    // FIX: Access messaging() correctly from the required module
    const response = await admin.messaging().sendEachForMulticast(message);

    // Return the specific counts so your UI "Success" isn't undefined
    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err: any) {
    console.error("Push Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}