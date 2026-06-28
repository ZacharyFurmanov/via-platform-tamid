"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function SetPassword() {
 const token = useSearchParams().get("token") || "";
 const [email, setEmail] = useState<string | null>(null);
 const [checking, setChecking] = useState(true);
 const [pw, setPw] = useState("");
 const [pw2, setPw2] = useState("");
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [done, setDone] = useState(false);

 useEffect(() => {
 fetch(`/api/admin/set-password?token=${encodeURIComponent(token)}`)
 .then((r) => r.json())
 .then((d) => { setEmail(d.email || null); setChecking(false); })
 .catch(() => setChecking(false));
 }, [token]);

 async function submit(e: React.FormEvent) {
 e.preventDefault();
 setErr(null);
 if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
 if (pw !== pw2) { setErr("Passwords don't match."); return; }
 setBusy(true);
 try {
 const r = await fetch("/api/admin/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
 const d = await r.json();
 if (!r.ok) setErr(d.error || "Couldn't set your password.");
 else setDone(true);
 } catch { setErr("Couldn't set your password."); }
 setBusy(false);
 }

 const input = "w-full border border-[#5D0F17]/20 bg-white px-3.5 py-3 text-sm text-[#5D0F17] outline-none focus:border-[#5D0F17]/50 transition";

 return (
 <main className="flex min-h-screen items-center justify-center bg-[#FFFDF8] px-6 text-[#5D0F17]">
 <div className="w-full max-w-sm">
 <p className="mb-2 text-center text-[11px] uppercase tracking-[0.22em] text-[#5D0F17]/45">VYA Admin</p>
 {checking ? (
 <p className="text-center text-sm text-[#5D0F17]/50">Checking your invite…</p>
 ) : !email ? (
 <p className="text-center text-sm text-[#5D0F17]/60">This invite link is invalid or has expired. Ask for a new one.</p>
 ) : done ? (
 <div className="text-center">
 <h1 className="mb-2 font-serif text-2xl">You&rsquo;re all set</h1>
 <p className="mb-6 text-sm text-[#5D0F17]/60">Your password is saved. Sign in with your email, password, and the code we email you.</p>
 <a href="/admin/login" className="inline-block bg-[#5D0F17] px-6 py-3 text-xs uppercase tracking-[0.15em] text-[#FFFDF8] hover:bg-[#5D0F17]/85">Go to sign in</a>
 </div>
 ) : (
 <form onSubmit={submit}>
 <h1 className="mb-1 text-center font-serif text-2xl">Set your password</h1>
 <p className="mb-6 text-center text-sm text-[#5D0F17]/55">for {email}</p>
 <input type="password" className={input} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ characters)" autoFocus />
 <input type="password" className={`${input} mt-3`} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm password" />
 <button type="submit" disabled={busy} className="mt-5 w-full bg-[#5D0F17] py-3 text-xs uppercase tracking-[0.15em] text-[#FFFDF8] transition hover:bg-[#5D0F17]/85 disabled:opacity-50">{busy ? "Saving…" : "Set password"}</button>
 {err && <p className="mt-3 text-center text-xs text-red-700">{err}</p>}
 </form>
 )}
 </div>
 </main>
 );
}

export default function SetPasswordPage() {
 return (
 <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#FFFDF8]" />}>
 <SetPassword />
 </Suspense>
 );
}
