export const ADMIN_SESSION_COOKIE = "via_admin_token";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function getAdminSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "via-admin-session"
  );
}

export function createAdminSessionToken(uid: string): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const sig = simpleHash(`${uid}:${exp}:${getAdminSessionSecret()}`);
  return `${uid}:${exp}:${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): { uid: string; exp: number } | null {
  if (!token) return null;

  const parts = token.split(":");
  if (parts.length !== 3) return null;

  const [uid, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!uid || !Number.isFinite(exp)) return null;

  if (exp <= Math.floor(Date.now() / 1000)) return null;

  const expectedSig = simpleHash(`${uid}:${exp}:${getAdminSessionSecret()}`);
  if (sig !== expectedSig) return null;

  return { uid, exp };
}
