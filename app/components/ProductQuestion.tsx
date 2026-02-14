"use client";

import { useState } from "react";

type ProductQuestionProps = {
  productTitle: string;
  storeName: string;
  productUrl: string;
};

export default function ProductQuestion({
  productTitle,
  storeName,
  productUrl,
}: ProductQuestionProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/product-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, question, productTitle, storeName, productUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong.");
        return;
      }

      setStatus("success");
      setEmail("");
      setQuestion("");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] uppercase tracking-[0.15em] text-black/50 hover:text-black transition cursor-pointer"
      >
        {open ? "− Close" : "+ Ask a Question"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 mb-1">
              Your Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-neutral-200 px-3 py-2.5 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/40 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 mb-1">
              Question
            </label>
            <textarea
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about sizing, condition, materials..."
              rows={3}
              className="w-full border border-neutral-200 px-3 py-2.5 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/40 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-black text-white text-[11px] uppercase tracking-[0.15em] px-6 py-3 hover:bg-black/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Sending..." : "Send Question"}
          </button>

          {status === "success" && (
            <p className="text-[11px] text-green-700">
              Your question has been sent. We&apos;ll get back to you soon.
            </p>
          )}

          {status === "error" && (
            <p className="text-[11px] text-red-600">{errorMsg}</p>
          )}
        </form>
      )}
    </div>
  );
}
