import { NextResponse } from "next/server";
import { getWinbackCandidates, recordWinbackSent } from "@/app/lib/notification-db";
import { sendWinbackEmail } from "@/app/lib/email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let sent = 0;
    let skipped = 0;

    for (const tier of ["14d", "30d"] as const) {
      const candidates = await getWinbackCandidates(tier);
      for (const candidate of candidates) {
        try {
          await sendWinbackEmail(candidate.email, tier);
          await recordWinbackSent(candidate.user_id, tier);
          sent++;
        } catch (err) {
          console.error(`Winback email failed for ${candidate.email}:`, err);
          skipped++;
        }
      }
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (err) {
    console.error("Winback cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
