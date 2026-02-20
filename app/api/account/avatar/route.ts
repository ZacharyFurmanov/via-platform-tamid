import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/app/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL not set");
  return url;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `avatars/${session.user.id}-${Date.now()}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type,
  });

  const sql = neon(getDatabaseUrl());

  // Get old image URL to delete if it's a Vercel Blob URL
  const rows = await sql`SELECT image FROM users WHERE id = ${session.user.id}`;
  const oldImage = rows[0]?.image as string | null;

  await sql`UPDATE users SET image = ${blob.url}, updated_at = NOW() WHERE id = ${session.user.id}`;

  // Best-effort delete old blob avatar
  if (oldImage && oldImage.includes("vercel-storage.com")) {
    try {
      await del(oldImage);
    } catch {
      // ignore deletion errors
    }
  }

  return NextResponse.json({ ok: true, url: blob.url });
}
