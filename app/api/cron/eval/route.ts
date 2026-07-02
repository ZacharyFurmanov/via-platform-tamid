import { NextResponse } from "next/server";
import { isIntakeConfigured } from "@/app/lib/ai-intake";
import { runEval, saveEvalRun } from "@/app/lib/eval-intake";

export const maxDuration = 300;

// Nightly (1 AM ET / 6 AM UTC): grade the current intake AI against a sample of the
// labeled dataset and store the scorecard, so the trend is ready each morning.
// Reverse-image on (matches production); price off by default to protect SerpApi
// quota — flip EVAL_NIGHTLY_PRICE=true to include it.
export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 if (!isIntakeConfigured()) {
 return NextResponse.json({ skipped: true, reason: "ANTHROPIC_API_KEY not set" });
 }
 const sample = Math.max(1, Math.min(50, Number(process.env.EVAL_NIGHTLY_SAMPLE) || 20));
 const withPrice = process.env.EVAL_NIGHTLY_PRICE === "true";
 try {
 const result = await runEval({ sample, withReverseImage: true, withPrice });
 await saveEvalRun(result);
 return NextResponse.json({ ok: true, ...result });
 } catch (e) {
 return NextResponse.json({ error: e instanceof Error ? e.message : "Eval failed" }, { status: 500 });
 }
}
