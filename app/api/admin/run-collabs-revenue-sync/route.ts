import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/app/lib/base-url";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const token = request.cookies.get("via_admin_token")?.value;
 return token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret) {
 return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
 }

 let baseUrl = getBaseUrl();
 if (baseUrl && !baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;

 let resp: Response;
 try {
 resp = await fetch(`${baseUrl}/api/cron/sync-collabs-revenue`, {
 headers: { Authorization: `Bearer ${cronSecret}` },
 });
 } catch (err) {
 return NextResponse.json({ error: "Failed to reach sync endpoint", detail: String(err) }, { status: 502 });
 }

 const data = await resp.json();
 return NextResponse.json(data, { status: resp.status });
}
