import { NextRequest, NextResponse } from "next/server";
import { approveAllWaitlistUsers } from "@/app/lib/pilot-db";
import crypto from "crypto";

function isAdminAuthenticated(request: NextRequest): boolean {
 const adminToken = request.cookies.get("via_admin_token")?.value;
 const expectedToken = process.env.ADMIN_PASSWORD;
 if (!expectedToken) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${expectedToken}`) return true;
 if (!adminToken) return false;
 const expected = crypto.createHash("sha256").update(expectedToken).digest("hex");
 return adminToken === expected;
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
