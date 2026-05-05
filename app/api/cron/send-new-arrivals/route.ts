import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getApprovedPilotEmails } from "@/app/lib/pilot-db";
import { sendNewArrivalsEmail } from "@/app/lib/email";
import { getSetting } from "@/app/lib/settings-db";
import type { DBProduct } from "@/app/lib/db";
import { DISABLED_STORE_SLUGS } from "@/app/lib/db";
import { brands as brandDefs } from "@/app/lib/brandData";

// Lowercase ILIKE patterns for all known designer brand keywords
const DESIGNER_PATTERNS = brandDefs.flatMap((b) => b.keywords.map((k) => `%${k}%`));

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get("testEmail");

  // Allow unauthenticated access for test sends (testEmail param) — never touches the lock
  if (!testEmail && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    // Read last-sent time first (used for the since window below)
    const lastSentRaw = await getSetting("new_arrivals_last_sent_at");

    if (!testEmail) {
      // Atomically claim the send slot — prevents double-sends from concurrent
      // Vercel cron invocations. Only the first caller wins the UPDATE; any
      // concurrent duplicate sees 0 rows returned and skips immediately.
      const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!dbUrl) return NextResponse.json({ error: "No database URL" }, { status: 500 });
      const sql = neon(dbUrl);
      await sql`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`;
      const claimed = await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('new_arrivals_last_sent_at', NOW()::text, NOW())
        ON CONFLICT (key) DO UPDATE
          SET value = NOW()::text, updated_at = NOW()
          WHERE app_settings.value::timestamptz < NOW() - INTERVAL '120 hours'
        RETURNING key
      `;
      if (claimed.length === 0) {
        const hoursSince = lastSentRaw
          ? Math.round((Date.now() - new Date(lastSentRaw).getTime()) / (1000 * 60 * 60))
          : 0;
        return NextResponse.json({
          ok: true,
          message: `New arrivals email already sent ${hoursSince}h ago — needs 120h to reset.`,
          skipped: true,
          lastSentAt: lastSentRaw,
          hoursSince,
        });
      }
    }

    // Test sends always look back 7 days so the window is useful regardless of when cron last ran
    const since = testEmail
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : lastSentRaw
        ? new Date(lastSentRaw)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "No database URL" }, { status: 500 });
    }

    const sql = neon(dbUrl);
    const sinceIso = since.toISOString();

    const rows = await sql`
      WITH base AS (
        SELECT *,
          CASE WHEN lower(title) LIKE ANY(${DESIGNER_PATTERNS}::text[]) THEN 1 ELSE 0 END AS is_designer
        FROM products
        WHERE created_at IS NOT NULL
          AND created_at >= ${sinceIso}
          AND created_at <= NOW() - interval '24 hours'
          AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
          AND title NOT ILIKE '%gift card%'
          AND image IS NOT NULL AND image != ''
          AND (${DISABLED_STORE_SLUGS.length} = 0 OR store_slug != ALL(${DISABLED_STORE_SLUGS}))
      ),
      store_scores AS (
        SELECT store_slug,
          COUNT(*)::int AS total_count,
          SUM(is_designer)::int AS designer_count
        FROM base
        GROUP BY store_slug
      ),
      ranked AS (
        SELECT b.*,
          ROW_NUMBER() OVER (
            PARTITION BY b.store_slug
            ORDER BY b.is_designer DESC, b.created_at DESC
          ) AS rn,
          ss.designer_count,
          ss.total_count
        FROM base b
        JOIN store_scores ss ON ss.store_slug = b.store_slug
      )
      SELECT id, store_slug, store_name, title, price, currency, compare_at_price,
             image, images, external_url, size, variant_id, collabs_link,
             shopify_product_id, created_at
      FROM ranked
      ORDER BY rn ASC, designer_count DESC, total_count DESC
      LIMIT 50
    `;

    const products = rows as DBProduct[];

    if (products.length === 0) {
      if (testEmail) {
        // Debug: show counts with and without the shopify filter to diagnose
        const [unfiltered] = await sql`
          SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE shopify_product_id IS NULL OR collabs_link IS NOT NULL) as after_shopify_filter,
            COUNT(DISTINCT store_slug) as store_count
          FROM products
          WHERE created_at IS NOT NULL
            AND created_at >= ${sinceIso}
            AND created_at <= NOW() - interval '24 hours'
            AND image IS NOT NULL AND image != ''
        `;
        return NextResponse.json({
          ok: true, message: "No new arrivals this week.", sent: 0,
          debug: { since: sinceIso, totalInWindow: unfiltered.total, afterShopifyFilter: unfiltered.after_shopify_filter },
        });
      }
      // Timestamp already claimed above — window resets from now
      return NextResponse.json({ ok: true, message: "No new arrivals this week.", sent: 0 });
    }

    const emails = testEmail ? [testEmail] : await getApprovedPilotEmails();

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, message: "No approved users to email.", sent: 0 });
    }

    const { sent, failed } = await sendNewArrivalsEmail(emails, products);

    // Timestamp already set atomically before sending (except for test sends which never claim)

    return NextResponse.json({ ok: true, since: sinceIso, products: products.length, sent, failed, test: !!testEmail });
  } catch (err) {
    console.error("New arrivals cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
