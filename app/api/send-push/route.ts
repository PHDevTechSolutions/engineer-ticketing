// app/api/send-push/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * Initialize Firebase Admin SDK
 * The .replace(/\\n/g, '\n') is critical for Vercel deployments
 * to handle private key formatting correctly.
 */
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "engiconnect-b15c6",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error: any) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens } = await request.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid registration tokens provided." },
        { status: 400 }
      );
    }

    // Prepare the multicast message for all targeted Engineering devices
    const message = {
      notification: {
        title: title || "New Notification",
        body: body || "You have a new update in EngiConnect.",
      },
      data: {
        url: "/request/shop-drawing", // Directs user to the specific page on tap
      },
      tokens: tokens,
      // APNS configuration is required to wake up iOS devices from sleep
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    // Send the message to all tokens in the array
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`Successfully sent ${response.successCount} messages.`);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error("Push Notification Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}