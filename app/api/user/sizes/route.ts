import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";

function getDb() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export async function GET() {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ sizes: [] });

 const sql = getDb();
 const rows = await sql`SELECT saved_sizes FROM users WHERE id = ${session.user.id}`;
 const raw = rows[0]?.saved_sizes;
 const sizes: string[] = raw ? JSON.parse(raw) : [];
 return NextResponse.json({ sizes });
}

export async function PUT(request: Request) {
 const session = await auth();
 if (!session?.user?.id) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const body = await request.json();
 if (!Array.isArray(body.sizes) || !body.sizes.every((s: unknown) => typeof s === "string")) {
 return NextResponse.json({ error: "Invalid sizes" }, { status: 400 });
 }

 const sql = getDb();
 await sql`
 UPDATE users
 SET saved_sizes = ${JSON.stringify(body.sizes)}, updated_at = NOW()
 WHERE id = ${session.user.id}
 `;
 return NextResponse.json({ ok: true });
}
