import { NextRequest, NextResponse } from "next/server";
import { getNewArrivals } from "@/app/lib/db";
import { getApprovedPilotEmails } from "@/app/lib/pilot-db";
import { sendNewArrivalsEmail } from "@/app/lib/email";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const cookie = req.cookies.get("via_admin_token")?.value;
  const crypto = require("crypto");
  const hashed = crypto.createHash("sha256").update(adminPassword).digest("hex");
  return cookie === hashed;
}

/**
 * POST /api/admin/send-new-arrivals-all
 * Sends a New Arrivals email to all approved VYA platform users (not just Insiders).
 * Optional body: { preview: true } — returns data without sending.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const preview = body?.preview === true;

  const [products, emails] = await Promise.all([
    getNewArrivals(12, 7, true),
    getApprovedPilotEmails(),
  ]);

  if (products.length === 0) {
    return NextResponse.json({ error: "No new arrivals in the last 7 days" }, { status: 400 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "No approved users to email" }, { status: 400 });
  }

  if (preview) {
    return NextResponse.json({
      preview: true,
      productCount: products.length,
      emailCount: emails.length,
      products: products.map((p) => ({ id: p.id, title: p.title, store: p.store_name })),
    });
  }

  const { sent, failed } = await sendNewArrivalsEmail(emails, products);

  return NextResponse.json({
    success: true,
    sent,
    failed,
    productCount: products.length,
    emailCount: emails.length,
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [products, emails] = await Promise.all([
    getNewArrivals(12, 7, true),
    getApprovedPilotEmails(),
  ]);

  return NextResponse.json({
    ready: products.length > 0 && emails.length > 0,
    productCount: products.length,
    emailCount: emails.length,
  });
}
