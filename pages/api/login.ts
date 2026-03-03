import { NextApiRequest, NextApiResponse } from "next";
import { validateUser, connectToDatabase } from "@/lib/ModuleGlobal/mongodb";
import { serialize } from "cookie";
import nodemailer from "nodemailer";
import { UAParser } from "ua-parser-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // mode and savedPin are sent from the LoginForm frontend
  const { Email, Password, deviceId, pin, mode, savedPin } = req.body;
  const db = await connectToDatabase();
  const usersCollection = db.collection("users");
  const securityAlerts = db.collection("security_alerts");

  let user;
  let isVerified = false;

  // --- 1. VERIFICATION LOGIC ---
  try {
    if (mode === "pin") {
      // PIN Mode: Verify the typed PIN against the value from Local Storage
      if (!pin || !deviceId) {
        return res.status(400).json({ message: "PIN and Device ID are required." });
      }

      // This is where the "cross-check" happens
      if (pin === savedPin) {
        isVerified = true;
      }

      // Find the user assigned to this specific device
      user = await usersCollection.findOne({ DeviceId: deviceId });
    } else {
      // Standard Mode: Find user by Email and check password
      if (!Email || !Password || !deviceId) {
        return res.status(400).json({ message: "Credentials and deviceId are required." });
      }
      
      user = await usersCollection.findOne({ Email });
      if (user) {
        const result = await validateUser({ Email, Password });
        if (result.success) isVerified = true;
      }
    }

    // --- 2. USER EXISTENCE CHECK ---
    if (!user) {
      return res.status(401).json({ 
        message: mode === "pin" ? "Device not linked to an account." : "Invalid credentials." 
      });
    }

    // --- 3. SHARED SECURITY CHECKS ---
    
    // Check if account is Resigned or Terminated
    if (["Resigned", "Terminated"].includes(user.Status)) {
      return res.status(403).json({ message: `Access denied. Account is ${user.Status}.` });
    }

    // Check if account is already Locked
    if (user.Status === "Locked") {
      return res.status(403).json({
        message: "Account Is Locked. Submit your ticket to IT Department.",
        locked: true,
      });
    }

    // Department Access Control (engiconnect protocol)
    const allowedDepartments = ["IT", "Sales", "Engineering", "Procurement"];
    if (!allowedDepartments.includes(user.Department)) {
      return res.status(403).json({ message: "Access denied: Unauthorized Department." });
    }

    // --- 4. HANDLE FAILED VERIFICATION ---
    if (!isVerified) {
      const attempts = (user.LoginAttempts || 0) + 1;
      const userAgent = req.headers["user-agent"] || "Unknown";
      const parser = new UAParser(userAgent);
      const deviceType = parser.getDevice().type || "desktop";

      // Security Alert at 2 failed attempts
      if (attempts === 2) {
        const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "Unknown IP";
        
        await securityAlerts.insertOne({
          Email: user.Email,
          ipAddress: ip,
          deviceId,
          userAgent,
          timestamp: new Date(),
          message: `2 failed attempts for ${user.Email}`,
        });

        // Optional: Trigger Nodemailer here to alert user
      }

      // Lock Account at 5 attempts
      if (attempts >= 5) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { Status: "Locked", LoginAttempts: attempts } }
        );
        return res.status(403).json({ message: "Account Is Locked.", locked: true });
      }

      await usersCollection.updateOne({ _id: user._id }, { $set: { LoginAttempts: attempts } });
      return res.status(401).json({ message: `Invalid credentials. Attempt ${attempts}/5` });
    }

    // --- 5. SUCCESS: UPDATE DATABASE & SESSION ---
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          LoginAttempts: 0,
          Status: "Active",
          DeviceId: deviceId, // Links the device if not already linked
          LastLoginAt: new Date(),
        },
      }
    );

    const userId = user._id.toString();

    // Set secure session cookie
    res.setHeader("Set-Cookie", serialize("session", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    }));

    return res.status(200).json({
      message: "Login successful",
      userId,
      Username: user.Username,
      Role: user.Role,
      Department: user.Department,
      Email: user.Email 
    });

  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ message: "System Connection Error." });
  }
}