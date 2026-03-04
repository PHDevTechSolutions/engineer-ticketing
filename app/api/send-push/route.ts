// app/api/send-push/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Admin SDK (Only once)
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

    const payload = {
      notification: { title, body },
      data: { url: "/request/shop-drawing" }, // Where to go when tapped
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true, // Crucial for waking up iOS
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...payload
    });

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}