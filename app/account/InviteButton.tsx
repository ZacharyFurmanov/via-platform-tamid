"use client";

import { useState } from "react";

const VIA_URL = "https://vyaplatform.com";
const INVITE_TEXT = `Join VYA! An online platform where you can shop the best vintage stores, all in one place! ${VIA_URL}`;

export default function InviteButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(VIA_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm uppercase tracking-[0.15em] px-5 py-3 border border-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
      >
        Invite a Friend
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#F7F3EA] text-[#5D0F17] w-full max-w-md p-8 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-xl">Invite a Friend</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#5D0F17]/40 hover:text-[#5D0F17] transition text-xl leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-[#5D0F17]/60 leading-relaxed">
              Share VYA with someone who&apos;d love it — vintage stores, all in one place.
            </p>

            {/* Link row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border border-[#5D0F17]/20 px-3 py-2.5 text-sm text-[#5D0F17]/70 truncate bg-white/50 select-all">
                {VIA_URL}
              </div>
              <button
                onClick={copyLink}
                className="shrink-0 text-xs uppercase tracking-[0.12em] px-4 py-2.5 bg-[#5D0F17] text-[#F7F3EA] hover:bg-[#5D0F17]/85 transition whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            {/* SMS share */}
            <a
              href={`sms:?body=${encodeURIComponent(INVITE_TEXT)}`}
              className="block text-center text-sm uppercase tracking-[0.15em] px-5 py-3 border border-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
            >
              Send as Text Message
            </a>
          </div>
        </div>
      )}
    </>
  );
}
