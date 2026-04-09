/**
 * UTM-tagged links to use in social media bios and posts.
 * Paste these URLs wherever you add a link on each platform.
 *
 * utm_source  = the platform (instagram, tiktok, linkedin)
 * utm_medium  = social
 * utm_campaign = bio  (for static profile/bio links)
 *               post (for links dropped in individual posts/captions)
 */

const BASE = "https://vyaplatform.com";

export const UTM_SOCIAL = {
  instagram: {
    bio:  `${BASE}?utm_source=instagram&utm_medium=social&utm_campaign=bio`,
    post: `${BASE}?utm_source=instagram&utm_medium=social&utm_campaign=post`,
  },
  tiktok: {
    bio:  `${BASE}?utm_source=tiktok&utm_medium=social&utm_campaign=bio`,
    post: `${BASE}?utm_source=tiktok&utm_medium=social&utm_campaign=post`,
  },
  linkedin: {
    bio:  `${BASE}?utm_source=linkedin&utm_medium=social&utm_campaign=bio`,
    post: `${BASE}?utm_source=linkedin&utm_medium=social&utm_campaign=post`,
  },
} as const;

/*
  ── COPY-PASTE REFERENCE ──────────────────────────────────────────────────────

  Instagram bio link:
  https://vyaplatform.com?utm_source=instagram&utm_medium=social&utm_campaign=bio

  TikTok bio link:
  https://vyaplatform.com?utm_source=tiktok&utm_medium=social&utm_campaign=bio

  LinkedIn bio/website link:
  https://vyaplatform.com?utm_source=linkedin&utm_medium=social&utm_campaign=bio

  ─────────────────────────────────────────────────────────────────────────────
*/
