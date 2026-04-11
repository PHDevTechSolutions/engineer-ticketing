import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docRef = doc(db, "system_config", "security");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return NextResponse.json(docSnap.data());
    }
    
    return NextResponse.json({ allowedIframeOrigins: [] });
  } catch (error) {
    console.error("API_CONFIG_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error", allowedIframeOrigins: [] }, { status: 500 });
  }
}
