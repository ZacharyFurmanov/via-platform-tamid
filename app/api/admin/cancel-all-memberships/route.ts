import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAdminAuthenticated(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const adminToken = request.cookies.get("via_admin_token")?.value;
 return !!adminToken && adminToken === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function POST(request: NextRequest) {
 if (!isAdminAuthenticated(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const stripeKey = process.env.STRIPE_SECRET_KEY;
 if (!stripeKey) {
 return NextResponse.json({ error: "No Stripe key configured" }, { status: 500 });
 }

 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ error: "No database URL" }, { status: 500 });
 const sql = neon(dbUrl);

 // Get all active members with a Stripe subscription ID
 const members = await sql`
 SELECT id, email, stripe_subscription_id
 FROM users
 WHERE is_member = TRUE AND stripe_subscription_id IS NOT NULL
 `;

 const results: { email: string; subscriptionId: string; status: string }[] = [];

 for (const member of members) {
 const subscriptionId = member.stripe_subscription_id as string;
 try {
 const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
 method: "DELETE",
 headers: { Authorization: `Bearer ${stripeKey}` },
 });
 const data = await res.json() as { status?: string; error?: { message: string } };
 results.push({
 email: member.email as string,
 subscriptionId,
 status: data.error ? `error: ${data.error.message}` : (data.status ?? "cancelled"),
 });
 } catch (err) {
 results.push({ email: member.email as string, subscriptionId, status: `failed: ${err}` });
 }
 }

 // Mark all as cancelled in the DB regardless
 await sql`UPDATE users SET is_member = FALSE WHERE is_member = TRUE`;

 return NextResponse.json({ cancelled: results.length, results });
}
