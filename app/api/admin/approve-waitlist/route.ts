import { NextRequest, NextResponse } from "next/server";
import { approveAllWaitlistUsers } from "@/app/lib/pilot-db";

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminToken = request.cookies.get("via_admin_token")?.value;
  const expectedToken = process.env.ADMIN_PASSWORD;
  if (!expectedToken || !adminToken) return false;
  let hash = 0;
  for (let i = 0; i < expectedToken.length; i++) {
    const char = expectedToken.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return adminToken === hash.toString(36);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await approveAllWaitlistUsers();
    return NextResponse.json({ approved: count, message: `Approved ${count} waitlist users` });
  } catch (error) {
    console.error("[ApproveWaitlist]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
