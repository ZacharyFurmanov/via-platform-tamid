import { NextRequest, NextResponse } from "next/server";
import { getAllSourcingRequests } from "@/app/lib/sourcing-db";
import { neon } from "@neondatabase/serverless";

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getAllSourcingRequests();

  // Load all offers keyed by request_id
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let offers: Record<string, unknown>[] = [];
  if (dbUrl) {
    const sql = neon(dbUrl);
    try {
      offers = await sql`
        SELECT so.*, sr.description AS request_description
        FROM sourcing_offers so
        LEFT JOIN sourcing_requests sr ON sr.id = so.request_id
        ORDER BY so.created_at ASC
      `;
    } catch {
      offers = [];
    }
  }

  const offersByRequest: Record<string, typeof offers> = {};
  for (const o of offers) {
    const rid = o.request_id as string;
    if (!offersByRequest[rid]) offersByRequest[rid] = [];
    offersByRequest[rid].push(o);
  }

  const data = requests.map((req) => {
    const reqOffers = (offersByRequest[req.id] ?? []).map((o) => ({
      id: o.id as string,
      storeSlug: o.store_slug as string,
      storeName: o.store_name as string,
      fee: Number(o.fee),
      timeline: o.timeline as string,
      notes: o.notes as string | null,
      status: o.status as string,
      createdAt: (o.created_at as Date).toISOString(),
    }));

    const acceptedOffer = reqOffers.find((o) => o.status === "accepted") ?? null;

    return {
      id: req.id,
      status: req.status,
      createdAt: req.createdAt,
      matchedStoreSlug: req.matchedStoreSlug,
      matchedStoreAt: req.matchedStoreAt,
      userName: req.userName,
      userEmail: req.userEmail,
      userPhone: req.userPhone,
      userInstagram: req.userInstagram,
      description: req.description,
      priceMin: req.priceMin,
      priceMax: req.priceMax,
      condition: req.condition,
      size: req.size,
      deadline: req.deadline,
      imageUrl: req.imageUrl,
      preferredStoreSlugs: req.preferredStoreSlugs,
      offers: reqOffers,
      acceptedOffer,
    };
  });

  return NextResponse.json({ requests: data });
}
