import { NextResponse } from "next/server";
import {
  getCounterStatus,
  adjustCounter,
  initializeCounter,
} from "@/lib/job-request-counter";

// Simple auth check - verify user is IT or Engineering
function isAuthorized(role: string | null, department: string | null): boolean {
  if (!role) return false;
  const authorizedRoles = ["SUPER ADMIN", "IT", "LEADER", "MANAGER"];
  const authorizedDepts = ["IT", "ENGINEERING"];
  return (
    authorizedRoles.includes(role) || authorizedDepts.includes(department || "")
  );
}

/**
 * GET /api/admin/job-counter
 * Get current counter status
 */
export async function GET(request: Request) {
  try {
    // In production, verify auth headers or session
    // For now, we'll check localStorage values passed as headers (simplified)
    const userRole = request.headers.get("x-user-role");
    const userDept = request.headers.get("x-user-department");

    if (!isAuthorized(userRole, userDept)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. IT or Engineering access required." },
        { status: 403 }
      );
    }

    const status = await getCounterStatus();

    return NextResponse.json({
      success: true,
      data: status,
      message: "Counter status retrieved",
    });
  } catch (error: any) {
    console.error("Error fetching counter status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch counter status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/job-counter
 * Initialize or adjust the counter
 */
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const userDept = request.headers.get("x-user-department");

    if (!isAuthorized(userRole, userDept)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. IT or Engineering access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, newNumber, isTest } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required (initialize, adjust, or status)" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "initialize":
        result = await initializeCounter(newNumber || 42);
        break;

      case "adjust":
        if (typeof newNumber !== "number") {
          return NextResponse.json(
            { success: false, error: "newNumber is required for adjust action" },
            { status: 400 }
          );
        }
        result = await adjustCounter(newNumber, isTest || false);
        break;

      case "status":
        const status = await getCounterStatus();
        return NextResponse.json({
          success: true,
          data: status,
          message: "Counter status retrieved",
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error managing job counter:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to manage counter" },
      { status: 500 }
    );
  }
}
