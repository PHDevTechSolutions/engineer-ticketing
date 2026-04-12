import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const Xchire_databaseUrl = process.env.TASKFLOW_DB_URL;
if (!Xchire_databaseUrl) {
  throw new Error("TASKFLOW_DB_URL is not set in the environment variables.");
}
const Xchire_sql = neon(Xchire_databaseUrl);

export async function GET(req: Request) {
  try {
    const Xchire_url = new URL(req.url);
    const referenceId = Xchire_url.searchParams.get("referenceid");
    const role = Xchire_url.searchParams.get("role")?.toUpperCase() || "";
    const name = Xchire_url.searchParams.get("name") || "";
    const department = Xchire_url.searchParams.get("department")?.toUpperCase() || "";
    
    // Pagination & Search params
    const search = Xchire_url.searchParams.get("search") || "";
    const limit = parseInt(Xchire_url.searchParams.get("limit") || "50");
    const offset = parseInt(Xchire_url.searchParams.get("offset") || "0");

    console.log("Hierarchy Fetch:", { referenceId, role, name, department, search, limit, offset });

    // Helper to build the WHERE clause based on hierarchy
    const getBaseQuery = async () => {
      if (department === 'IT' || role === 'SUPER ADMIN') {
        return { condition: Xchire_sql`1=1`, params: [] };
      }

      const columns = await Xchire_sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'accounts';
      `;
      const hasTSMCol = columns.some(c => c.column_name === 'tsm');
      const hasManagerCol = columns.some(c => c.column_name === 'manager');

      if (role === 'MANAGER' && hasManagerCol) {
        return { condition: Xchire_sql`(manager = ${name} OR referenceid = ${referenceId})` };
      } else if (role === 'TSM' && hasTSMCol) {
        return { condition: Xchire_sql`(tsm = ${name} OR referenceid = ${referenceId})` };
      } else {
        return { condition: Xchire_sql`referenceid = ${referenceId}` };
      }
    };

    const { condition } = await getBaseQuery();
    const searchPattern = `%${search}%`;

    // Fetch paginated data
    const data = await Xchire_sql`
      SELECT * FROM accounts 
      WHERE ${condition}
      AND (company_name ILIKE ${searchPattern} OR referenceid ILIKE ${searchPattern})
      ORDER BY company_name ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    // Fetch total count for the specific user/search
    const countResult = await Xchire_sql`
      SELECT COUNT(*) as total FROM accounts 
      WHERE ${condition}
      AND (company_name ILIKE ${searchPattern} OR referenceid ILIKE ${searchPattern});
    `;

    return NextResponse.json({ 
      success: true, 
      data, 
      total: parseInt(countResult[0].total),
      hasMore: data.length === limit
    });
  } catch (Xchire_error: any) {
    console.error("Error fetching accounts:", Xchire_error);
    return NextResponse.json({ success: false, error: Xchire_error.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
