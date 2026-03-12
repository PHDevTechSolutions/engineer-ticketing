import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 

const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    // Robust Private Key parsing for Vercel
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    const formattedKey = rawKey 
      ? rawKey.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1') 
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "engiconnect-b15c6",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
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
          requireInteraction: true,
        },
        fcm_options: {
          link: url || "/",
        },
      },
    };

    // Use await to ensure the function doesn't terminate before the push is sent
    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err: any) {
    console.error("Push API Fatal Error:", err.message);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}