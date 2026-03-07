import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { firebaseAdapter } from "@/app/lib/auth-adapter";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";

function baseStyles() {
  return `
    body { margin: 0; padding: 0; background-color: #F7F3EA; font-family: Georgia, 'Times New Roman', serif; }
    .wrapper { background-color: #F7F3EA; padding: 40px 16px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 32px 0 28px; }
    .content { background: #ffffff; padding: 40px 32px; }
    .content h2 { font-size: 24px; font-weight: 400; color: #5D0F17; margin: 0 0 16px 0; line-height: 1.3; font-family: Georgia, serif; }
    .content p { font-size: 15px; color: #5D0F17; line-height: 1.6; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #5D0F17; color: #F7F3EA !important; padding: 14px 32px; text-decoration: none; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 8px; font-family: Georgia, serif; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: rgba(93,15,23,0.45); padding-bottom: 24px; }
  `;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: firebaseAdapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      options: {
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      from: "VIA <hana@theviaplatform.com>",
      apiKey: process.env.RESEND_API_KEY,
      async sendVerificationRequest({ identifier: email, url }) {
        const { Resend: ResendClient } = await import("resend");
        const resend = new ResendClient(process.env.RESEND_API_KEY!);

        await resend.emails.send({
          from: "VIA <hana@theviaplatform.com>",
          to: email,
          subject: "Sign in to VIA",
          html: `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
:root { color-scheme: light only; }
${baseStyles()}
@media (prefers-color-scheme: dark) {
  body, .wrapper { background-color: #F7F3EA !important; }
  .content { background-color: #ffffff !important; }
  .content h2 { color: #5D0F17 !important; }
  .content p { color: #5D0F17 !important; }
  .btn { background-color: #5D0F17 !important; color: #F7F3EA !important; }
  .footer { color: rgba(93,15,23,0.45) !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F7F3EA;">
<div class="wrapper" style="background-color:#F7F3EA;padding:40px 16px;">
  <div class="container" style="max-width:600px;margin:0 auto;">
    <div class="header" style="text-align:center;padding:32px 0 28px;">
      <img src="${BASE_URL}/via-logo.png" alt="VIA" width="120" style="display:block;margin:0 auto;max-height:80px;width:auto;" border="0" />
    </div>
    <div class="content" style="background:#ffffff;padding:40px 32px;">
      <h2>Sign in to VIA</h2>
      <p>Click the button below to sign in to your VIA account. This link expires in 24 hours.</p>
      <a href="${url}" class="btn">Sign In</a>
      <p style="font-size:12px;color:rgba(93,15,23,0.45);margin-top:24px;">If you didn't request this email, you can safely ignore it.</p>
    </div>
    <div class="footer" style="text-align:center;margin-top:32px;font-size:11px;color:rgba(93,15,23,0.45);padding-bottom:24px;">
      <p>&copy; ${new Date().getFullYear()} VIA. Vintage &amp; secondhand, worldwide.</p>
    </div>
  </div>
</div>
</body>
</html>`,
        });
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login/error",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  trustHost: true,
  debug: true,
  logger: {
    error(error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("AUTH ERROR:", {
        message: err.message,
        name: err.name,
        type: (err as unknown as Record<string, unknown>).type,
        cause: err.cause instanceof Error
          ? { message: err.cause.message, name: err.cause.name }
          : err.cause,
        stack: err.stack,
      });
    },
    warn(code) {
      console.warn("AUTH WARN:", code);
    },
  },
});
