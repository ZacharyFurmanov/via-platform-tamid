"use client";

export default function BackButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.history.back()}
      className="inline-block text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
    >
      &larr; {label}
    </button>
  );
}
