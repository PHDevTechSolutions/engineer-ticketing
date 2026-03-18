import { NextApiRequest, NextApiResponse } from "next";
import { validateUser, connectToDatabase } from "@/lib/ModuleGlobal/mongodb";
import { serialize } from "cookie";
import { UAParser } from "ua-parser-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { Email, Password, deviceId, pin, mode, savedPin } = req.body;
  const db = await connectToDatabase();
  const usersCollection = db.collection("users");
  const securityAlerts = db.collection("security_alerts");

  let user;
  let isVerified = false;

  try {
    if (mode === "pin") {
      if (!pin || !deviceId) {
        return res.status(400).json({ message: "PIN and Device ID are required." });
      }
      if (pin === savedPin) isVerified = true;
      user = await usersCollection.findOne({ DeviceId: deviceId });
    } else {
      if (!Email || !Password || !deviceId) {
        return res.status(400).json({ message: "Credentials and deviceId are required." });
      }
      user = await usersCollection.findOne({ Email });
      if (user) {
        const result = await validateUser({ Email, Password });
        if (result.success) isVerified = true;
      }
    }

    if (!user) {
      return res.status(401).json({ 
        message: mode === "pin" ? "Device not linked to an account." : "Invalid credentials." 
      });
    }

    if (["Resigned", "Terminated"].includes(user.Status)) {
      return res.status(403).json({ message: `Access denied. Account is ${user.Status}.` });
    }

    if (user.Status === "Locked") {
      return res.status(403).json({
        message: "Account Is Locked. Submit your ticket to IT Department.",
        locked: true,
      });
    }

    const allowedDepartments = ["IT", "Sales", "Engineering", "Procurement"];
    if (!allowedDepartments.includes(user.Department)) {
      return res.status(403).json({ message: "Access denied: Unauthorized Department." });
    }

    if (!isVerified) {
      const attempts = (user.LoginAttempts || 0) + 1;
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

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { LoginAttempts: 0, Status: "Active", DeviceId: deviceId, LastLoginAt: new Date() } }
    );

    const userId = user._id.toString();

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
      Firstname: user.Firstname || user.Username, // Added Firstname fallback
      Role: user.Role,
      Department: user.Department,
      Email: user.Email 
    });

  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({ message: "System Connection Error." });
  }
}