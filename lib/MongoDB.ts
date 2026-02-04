import { MongoClient, ObjectId, Db } from "mongodb";
import bcrypt from "bcrypt";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const uri = process.env.MONGODB_URI;

// 🔹 Connection Options to fix ETIMEDOUT
const options = {
  serverSelectionTimeoutMS: 5000, // Fail after 5s instead of 30s
  family: 4,                      // 🔹 FORCE IPv4 (Fixes most timeout issues in Node 18+)
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClient: MongoClient | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    // Pass the options here
    global._mongoClient = new MongoClient(uri, options);
  }
  client = global._mongoClient;
  clientPromise = client.connect();
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectToDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db("ecoshift");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    throw error;
  }
}


// 🔹 Register a new user
export async function registerUser({
  userName,
  Email,
  Password,
}: {
  userName: string;
  Email: string;
  Password: string;
}) {
  const db = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Check if email already exists
  const existingUser = await usersCollection.findOne({ Email });
  if (existingUser) {
    return { success: false, message: "Email already in use" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(Password, 10);

  // Insert new user
  await usersCollection.insertOne({
    userName,
    Email,
    Password: hashedPassword,
    createdAt: new Date(),
  });

  return { success: true };
}

// 🔹 Validate user credentials (with caching layer optional)
const userCache = new Map<string, any>(); // simple in-memory cache (FDT style)

export async function validateUser({
  Email,
  Password,
}: {
  Email: string;
  Password: string;
}) {
  // Check cache first (avoid DB hit)
  if (userCache.has(Email)) {
    const cachedUser = userCache.get(Email);
    const isValidPassword = await bcrypt.compare(Password, cachedUser.Password);
    if (isValidPassword) return { success: true, user: cachedUser };
  }

  const db = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Find user in DB
  const user = await usersCollection.findOne({ Email });
  if (!user) {
    return { success: false, message: "Invalid email or password" };
  }

  // Validate password
  const isValidPassword = await bcrypt.compare(Password, user.Password);
  if (!isValidPassword) {
    return { success: false, message: "Invalid email or password" };
  }

  // Save to cache for faster next access
  userCache.set(Email, user);

  return { success: true, user };
}
