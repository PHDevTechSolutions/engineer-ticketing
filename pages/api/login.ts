import { NextApiRequest, NextApiResponse } from "next";
import { validateUser, connectToDatabase } from "@/lib/ModuleGlobal/mongodb";
import { serialize } from "cookie";
import nodemailer from "nodemailer";
import { UAParser } from "ua-parser-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { Email, Password, deviceId } = req.body;
  if (!Email || !Password || !deviceId) {
    return res.status(400).json({ message: "Email, Password, and deviceId are required." });
  }

  const db = await connectToDatabase();
  const usersCollection = db.collection("users");
  const securityAlerts = db.collection("security_alerts");

  // 🔍 Find user
  const user = await usersCollection.findOne({ Email });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  // ❌ Resigned / Terminated Logic
  if (["Resigned", "Terminated"].includes(user.Status)) {
    return res.status(403).json({
      message: `Your account is ${user.Status}. Access denied.`,
    });
  }

  // 🔒 Already Locked Check
  if (user.Status === "Locked") {
    return res.status(403).json({
      message: "Account Is Locked. Submit your ticket to IT Department.",
      locked: true,
    });
  }

  // 🔑 Access Control: IT, Sales, and Engineering
  const allowedDepartments = ["IT", "Sales", "Engineering"];
  if (!allowedDepartments.includes(user.Department)) {
    return res.status(403).json({
      message: "Access denied: Unauthorized Department.",
    });
  }

  const result = await validateUser({ Email, Password });

  // Parsing Device Info for Alerts
  const userAgent = req.headers["user-agent"] || "Unknown";
  const parser = new UAParser(userAgent);
  const deviceType = parser.getDevice().type || "desktop";

  // ---------------- FAILED LOGIN LOGIC ----------------
  if (!result.success || !result.user) {
    const attempts = (user.LoginAttempts || 0) + 1;

    // Send Security Email Alert at 2 failed attempts
    if (attempts === 2) {
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "Unknown IP";
      const timestamp = new Date();

      // Log Alert to MongoDB
      await securityAlerts.insertOne({
        Email,
        ipAddress: ip,
        deviceId,
        userAgent,
        deviceType,
        timestamp,
        message: `2 failed login attempts detected for ${Email}`,
      });

      // Send Email via Nodemailer
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"DSI Security" <${process.env.EMAIL_USER}>`,
          to: Email,
          subject: `Security Alert: Login attempts on your account`,
          html: `
            <h3>Security Alert</h3>
            <p>Multiple failed login attempts detected for <strong>${Email}</strong>.</p>
            <ul>
              <li><strong>IP:</strong> ${ip}</li>
              <li><strong>Device:</strong> ${deviceType}</li>
              <li><strong>Time:</strong> ${timestamp.toLocaleString()}</li>
            </ul>
            <p>If this wasn't you, please secure your account immediately.</p>
          `,
        });
      } catch (err) {
        console.error("Nodemailer Error:", err);
      }
    }

    // Lock Account at 5 attempts
    if (attempts >= 5) {
      await usersCollection.updateOne(
        { Email },
        { $set: { LoginAttempts: attempts, Status: "Locked" } }
      );
      return res.status(403).json({
        message: "Account Is Locked. Submit your ticket to IT Department.",
        locked: true,
      });
    }

    // Update attempts count
    await usersCollection.updateOne({ Email }, { $set: { LoginAttempts: attempts } });

    return res.status(401).json({
      message: `Invalid credentials. Attempt ${attempts}/5`,
    });
  }

  // ---------------- SUCCESS LOGIN LOGIC ----------------
  // Reset attempts, set Status to Active, and update DeviceId
  await usersCollection.updateOne(
    { Email },
    {
      $set: {
        LoginAttempts: 0,
        Status: "Active",
        DeviceId: deviceId,
        LastLoginAt: new Date(),
      },
    }
  );

  const userId = result.user._id.toString();

  // Set Cookie session
  res.setHeader(
    "Set-Cookie",
    serialize("session", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    })
  );

  return res.status(200).json({
    message: "Login successful",
    userId,
    Username: user.Username, // Needed for your LoginForm localStorage
    Role: user.Role,
    Department: user.Department,
  });
}