"use client";

export default function BackButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.history.back()}
      className="inline-block text-xs tracking-[0.25em] uppercase text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
    >
      &larr; {label}
    </button>
  );
}
