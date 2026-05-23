import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const secretKey = process.env.STRIPE_SECRET_KEY_CARROLL;
 if (!secretKey) {
 return NextResponse.json({ error: "STRIPE_SECRET_KEY_CARROLL not set" }, { status: 500 });
 }

 const headers = { Authorization: `Bearer ${secretKey}` };

 // Fetch all payment links
 const links: { id: string; active: boolean; url: string; line_items?: unknown }[] = [];
 let startingAfter: string | undefined;
 do {
 const params = new URLSearchParams({ limit: "100" });
 if (startingAfter) params.set("starting_after", startingAfter);
 const res = await fetch(`https://api.stripe.com/v1/payment_links?${params}`, { headers });
 if (!res.ok) {
 const err = await res.json();
 return NextResponse.json({ error: err?.error?.message ?? `Stripe ${res.status}` }, { status: 500 });
 }
 const data = await res.json() as { data: { id: string; active: boolean; url: string }[]; has_more: boolean };
 links.push(...data.data);
 startingAfter = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
 } while (startingAfter);

 return NextResponse.json({
 total: links.length,
 active: links.filter((l) => l.active).length,
 links: links.map((l) => ({ id: l.id, active: l.active, url: l.url })),
 });
}
