import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { baselineExistingAsAlerted } from "@/app/lib/listing-quality-db";

// Marks every CURRENT product as already-alerted, without sending any email. Run
// this once before enabling the weekly digest if you only want emails for
// listings added from now on (not the existing backlog of flagged listings).
//   POST /api/admin/listing-baseline

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 const baselined = await baselineExistingAsAlerted();
 return NextResponse.json({ ok: true, baselined, note: "Existing listings will not be emailed; only listings added from now on." });
}
