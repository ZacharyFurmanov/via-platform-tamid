// Single source of truth for VYA access codes. A valid code both (a) unlocks
// site access (via_access cookie, /api/access-code) AND (b) skips the waitlist
// with immediate approval (/api/pilot-register). Keep these in sync by using
// isValidAccessCode() everywhere instead of duplicating lists.

const STATIC_CODES = [
 "lisa",
 "sophia",
 "matty",
 "mom",
 "projectpal",
 "vyafriend",
 "rachael",
 "kendell",
 "elsa",
 "vintageedit",
 "kamryn",
];

/** All currently-valid access codes (lowercased), including the env primary code. */
export function getAccessCodes(): Set<string> {
 const primary = (process.env.VIA_ACCESS_CODE || "vyainsider").toLowerCase();
 return new Set([primary, ...STATIC_CODES]);
}

/** True if `code` is a valid access code (case/whitespace-insensitive). */
export function isValidAccessCode(code: unknown): boolean {
 if (typeof code !== "string") return false;
 return getAccessCodes().has(code.trim().toLowerCase());
}
