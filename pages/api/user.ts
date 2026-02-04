import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/MongoDB";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const db = await connectToDatabase();
    const userId = req.query.id as string;
    const role = req.query.role as string;

    // CASE 1: Single User
    if (userId) {
      if (!ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid ID" });
      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password, ...userData } = user;
      return res.status(200).json(userData);
    }

    // CASE 2: All Users (Dropdown)
    const filter = role ? { role: role } : {};
    const users = await db.collection("users")
      .find(filter)
      .project({ password: 0 }) 
      .toArray();

    return res.status(200).json(users);

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}