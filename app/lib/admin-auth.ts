import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "./admin-session";

export function isAdminSessionAuthorized(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return !!verifyAdminSessionToken(token);
}

export function isAdminRequestAuthorized(request: NextRequest): boolean {
  if (isAdminSessionAuthorized(request)) return true;

  // Optional fallback for script-based admin jobs using Authorization header.
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get("authorization");
  if (adminPassword && authHeader === `Bearer ${adminPassword}`) return true;

  return false;
}
