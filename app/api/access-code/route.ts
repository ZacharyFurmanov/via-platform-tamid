import { NextResponse } from "next/server";

const ACCESS_CODE = process.env.VIA_ACCESS_CODE || "VIAInsider";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (typeof code !== "string" || code.trim().toLowerCase() !== ACCESS_CODE.toLowerCase()) {
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
