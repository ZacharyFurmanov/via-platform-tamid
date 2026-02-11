import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { neonAdapter } from "@/app/lib/auth-adapter";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";

function baseStyles() {
  return `
    body { margin: 0; padding: 0; background-color: #f7f6f3; font-family: 'Cormorant Garamond', Georgia, serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; color: #000; margin: 0; }
    .content { background: #ffffff; padding: 40px 32px; border-radius: 4px; }
    .content h2 { font-size: 24px; font-weight: 400; color: #000; margin: 0 0 16px 0; line-height: 1.3; }
    .content p { font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #000; color: #fff !important; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #999; }
  `;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: neonAdapter,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
          html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles()}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>VIA</h1></div>
    <div class="content">
      <h2>Sign in to VIA</h2>
      <p>Click the button below to sign in to your VIA account. This link expires in 24 hours.</p>
      <a href="${url}" class="btn">Sign In</a>
      <p style="font-size: 13px; color: #999; margin-top: 24px;">If you didn't request this email, you can safely ignore it.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & resale, nationwide.</p>
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
});
