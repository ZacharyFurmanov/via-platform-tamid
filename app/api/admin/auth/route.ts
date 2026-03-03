import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { Resend } from "resend";

// Simple hash function - must match middleware
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/** Signs an OTP + expiry with HMAC so it can be stored in a cookie safely */
function signOtp(otp: string, expiry: number): string {
  const key = process.env.ADMIN_PASSWORD ?? "via-admin";
  const sig = crypto
    .createHmac("sha256", key)
    .update(`${otp}:${expiry}`)
    .digest("hex");
  return `${otp}:${expiry}:${sig}`;
}

/** Returns the OTP string if the cookie is valid and not expired, otherwise null */
function verifyOtpCookie(cookieValue: string): string | null {
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;
  const [otp, expiryStr, sig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) return null;

  const key = process.env.ADMIN_PASSWORD ?? "via-admin";
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${otp}:${expiry}`)
    .digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  return otp;
}

async function sendOtpEmail(otp: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "VIA Admin <hana@theviaplatform.com>",
    to: "hana@theviaplatform.com",
    subject: `${otp} — VIA Admin Sign-In Code`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
:root { color-scheme: light only; }
body { margin: 0; padding: 0; background-color: #F7F3EA; font-family: Georgia, 'Times New Roman', serif; }
@media (prefers-color-scheme: dark) {
  body { background-color: #F7F3EA !important; }
  .wrapper { background-color: #F7F3EA !important; }
  .content { background-color: #ffffff !important; }
  .code-box { background-color: #F7F3EA !important; color: #5D0F17 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F7F3EA;">
<div class="wrapper" style="background-color:#F7F3EA;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;">
    <div class="content" style="background:#ffffff;padding:40px 32px;text-align:center;">
      <p style="font-size:13px;color:#5D0F17;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 24px;">VIA Admin</p>
      <p style="font-size:15px;color:#5D0F17;margin:0 0 24px;">Your sign-in code:</p>
      <div class="code-box" style="background:#F7F3EA;padding:20px;font-size:36px;font-family:monospace;letter-spacing:0.3em;color:#5D0F17;margin:0 0 24px;">
        ${otp}
      </div>
      <p style="font-size:12px;color:rgba(93,15,23,0.5);margin:0;">Expires in 10 minutes. If you didn't request this, ignore it.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  });
}

export async function POST(request: Request) {
  try {
    const { password, otpCode } = await request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
      return NextResponse.json(
        { error: "Admin access not configured" },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Step 2: password + OTP code submitted
    if (otpCode) {
      const cookieStore = await cookies();
      const pendingCookie = cookieStore.get("via_admin_otp")?.value;

      if (!pendingCookie) {
        return NextResponse.json(
          { error: "Code expired. Please try again." },
          { status: 401 }
        );
      }

      const validOtp = verifyOtpCookie(pendingCookie);
      if (!validOtp) {
        return NextResponse.json(
          { error: "Code expired. Please try again." },
          { status: 401 }
        );
      }

      const submitted = otpCode.replace(/\s/g, "");
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(submitted.padEnd(6, " ")),
        Buffer.from(validOtp.padEnd(6, " "))
      );
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect code." },
          { status: 401 }
        );
      }

      // Valid — set auth cookie and clear OTP cookie
      cookieStore.set("via_admin_token", hashPassword(expectedPassword), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      cookieStore.delete("via_admin_otp");
      return NextResponse.json({ success: true });
    }

    // Step 1: password only — generate and send OTP
    const otp = generateOtp();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    const cookieStore = await cookies();
    cookieStore.set("via_admin_otp", signOtp(otp, expiry), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    await sendOtpEmail(otp);
    return NextResponse.json({ requireOtp: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// Logout endpoint
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("via_admin_token");
  cookieStore.delete("via_admin_otp");
  return NextResponse.json({ success: true });
}
