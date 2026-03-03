import { NextRequest, NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

/**
 * GET /api/admin/totp-setup
 * Returns a QR code and the secret for setting up TOTP in Authy.
 * If ADMIN_TOTP_SECRET is already set, uses that secret.
 * If not, generates a new random secret (not saved — you must set it in Vercel).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingSecret = process.env.ADMIN_TOTP_SECRET;
  let secret: OTPAuth.Secret;

  if (existingSecret) {
    secret = OTPAuth.Secret.fromBase32(existingSecret);
  } else {
    secret = new OTPAuth.Secret({ size: 20 });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "VIA Admin",
    label: "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 300 });

  return NextResponse.json({
    secret: secret.base32,
    otpauthUri,
    qrDataUrl,
    alreadyConfigured: !!existingSecret,
  });
}
