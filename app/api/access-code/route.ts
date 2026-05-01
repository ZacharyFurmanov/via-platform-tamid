import { NextResponse } from "next/server";

const PRIMARY_CODE = process.env.VIA_ACCESS_CODE || "vyainsider";
const VALID_CODES = new Set([PRIMARY_CODE.toLowerCase(), "lisa", "sophia", "matty"]);

export async function POST(request: Request) {
  const { code } = await request.json();

  if (typeof code !== "string" || !VALID_CODES.has(code.trim().toLowerCase())) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("via_access", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}
