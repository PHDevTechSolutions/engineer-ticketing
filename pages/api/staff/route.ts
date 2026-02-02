import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/MongoDB";

export async function GET(request: Request) {
  try {
    const db = await connectToDatabase();
    
    // Define allowed departments strictly
    const allowedDepartments = ["IT", "Engineering", "Sales"];

    // Fetch ONLY users in these departments
    const staff = await db.collection("users")
      .find({ 
        Department: { $in: allowedDepartments } 
      })
      .project({ 
        password: 0, 
        salt: 0, 
        __v: 0,
        resetToken: 0,
        twoFactorSecret: 0 // Additional security layer
      }) 
      .sort({ Lastname: 1 }) 
      .toArray();

    return NextResponse.json(staff);
  } catch (error) {
    console.error("CRITICAL_DB_ERROR:", error);
    return NextResponse.json(
      { error: "SYSTEM_FAILURE" }, 
      { status: 500 }
    );
  }
}