import { NextResponse } from "next/server";
import { isValidAccessCode } from "@/app/lib/accessCodes";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!isValidAccessCode(code)) {
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
