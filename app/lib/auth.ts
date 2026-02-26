import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import type { DecodedIdToken } from "firebase-admin/auth";
import { neonAdapter } from "@/app/lib/auth-adapter";
import { verifyFirebaseIdToken } from "@/app/lib/firebase-admin";

type DbUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
  return url;
}

async function getOrCreateUserFromFirebase(decodedToken: DecodedIdToken): Promise<DbUser | null> {
  const email = decodedToken.email;
  if (!email) return null;

  const sql = neon(getDatabaseUrl());
  const existing = await sql`SELECT id, name, email, image FROM users WHERE email = ${email} LIMIT 1`;
  if (existing[0]) {
    return existing[0] as DbUser;
  }

  const name = typeof decodedToken.name === "string" ? decodedToken.name : null;
  const image = typeof decodedToken.picture === "string" ? decodedToken.picture : null;
  const emailVerified = decodedToken.email_verified ? new Date().toISOString() : null;

  const created = await sql`
    INSERT INTO users (name, email, email_verified, image)
    VALUES (${name}, ${email}, ${emailVerified}, ${image})
    RETURNING id, name, email, image
  `;

  return (created[0] as DbUser) ?? null;
}

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
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      options: {
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  providers: [
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken =
          typeof credentials?.idToken === "string" ? credentials.idToken : null;
        if (!idToken) return null;

        try {
          const decodedToken = await verifyFirebaseIdToken(idToken);
          return await getOrCreateUserFromFirebase(decodedToken);
        } catch (error) {
          console.error("FIREBASE AUTHORIZE ERROR:", error);
          return null;
        }
      },
    }),
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
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & secondhand, worldwide.</p>
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
