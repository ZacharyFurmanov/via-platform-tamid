"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SetupData {
  secret: string;
  qrDataUrl: string;
  alreadyConfigured: boolean;
}

export default function TotpSetupPage() {
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/totp-setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load setup data."));
  }, []);

  function copySecret() {
    if (!data) return;
    navigator.clipboard.writeText(data.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="bg-white min-h-screen text-black flex items-center justify-center">
      <div className="w-full max-w-lg px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">Authenticator Setup</h1>
          <p className="text-neutral-500 text-sm">
            Scan this QR code with Authy to enable two-factor authentication.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center mb-6">{error}</p>
        )}

        {!data && !error && (
          <p className="text-center text-neutral-400 text-sm">Loading…</p>
        )}

        {data && (
          <div className="space-y-6">
            {data.alreadyConfigured && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 text-center">
                TOTP is already configured. Scanning this code will re-add the
                account in Authy using the same secret.
              </div>
            )}

            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrDataUrl}
                alt="TOTP QR code"
                className="border border-neutral-200"
                width={240}
                height={240}
              />
            </div>

            <div>
              <p className="text-xs text-neutral-500 text-center mb-2">
                Can&apos;t scan? Enter this secret manually in Authy:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-neutral-100 px-3 py-2 text-sm font-mono tracking-widest text-center break-all">
                  {data.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="px-3 py-2 border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {!data.alreadyConfigured && (
              <div className="bg-neutral-50 border border-neutral-200 text-sm px-4 py-4 space-y-2">
                <p className="font-medium">After scanning:</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-600">
                  <li>
                    Go to{" "}
                    <strong>Vercel → Settings → Environment Variables</strong>
                  </li>
                  <li>
                    Add <code className="bg-white px-1">ADMIN_TOTP_SECRET</code>{" "}
                    with the value above
                  </li>
                  <li>Redeploy the app</li>
                  <li>
                    Next login will require your password + the 6-digit code
                    from Authy
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/admin"
            className="text-sm text-neutral-500 hover:text-black transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
