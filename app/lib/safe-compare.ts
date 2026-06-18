// Constant-time string comparison for secrets / HMAC signatures.
// A plain `a === b` short-circuits on the first differing byte, leaking how much
// of a guessed signature is correct via response timing. This compares every byte
// regardless. Length is allowed to leak (HMAC digests are a fixed length), so an
// up-front length check is fine.
export function timingSafeEqualStr(a: string, b: string): boolean {
 if (typeof a !== "string" || typeof b !== "string") return false;
 if (a.length !== b.length) return false;
 let diff = 0;
 for (let i = 0; i < a.length; i++) {
  diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
 }
 return diff === 0;
}
