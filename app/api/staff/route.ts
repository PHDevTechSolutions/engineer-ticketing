import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/MongoDB";

export async function GET(request: Request) {
  try {
    // 1. BASIC SECURITY CHECK (Optional: Check for a custom header or session)
    // In a real app, use 'next-auth' or check a Bearer token
    const authHeader = request.headers.get("authorization");
    /* if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: "UNAUTHORIZED_ACCESS" }, { status: 401 });
    } 
    */

    const db = await connectToDatabase();
    
    // 2. FETCH ALL DEPARTMENTS (Removed the "Engineering" restriction)
    const staff = await db.collection("users")
      .find({}) // Fetch all users to populate the full directory
      .project({ 
        password: 0, 
        salt: 0, 
        __v: 0,
        resetToken: 0 
      }) 
      .sort({ Lastname: 1 }) // Organizes the list alphabetically
      .toArray();

    // 3. ADD SYSTEM LOGGING (Optional)
    console.log(`[SYS-LOG]: Staff Directory accessed at ${new Date().toISOString()}`);

    return NextResponse.json(staff);
  } catch (error) {
    console.error("CRITICAL_DB_ERROR:", error);
    return NextResponse.json(
      { error: "SYSTEM_FAILURE", details: "Check database connection" }, 
      { status: 500 }
    );
  }
}