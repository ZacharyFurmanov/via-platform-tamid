"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONDITIONS = ["New", "Like New", "Good", "Fair"] as const;
const DEADLINES = ["ASAP", "1 week", "2 weeks", "1 month", "No deadline"] as const;

type Props = {
  requestId: string;
  initial: {
    description: string;
    priceMin: number;
    priceMax: number;
    condition: string;
    size: string | null;
    deadline: string;
    userPhone: string | null;
    userInstagram: string | null;
  };
};

export default function EditRequestSection({ requestId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(initial.description);
  const [priceMin, setPriceMin] = useState(String(initial.priceMin));
  const [priceMax, setPriceMax] = useState(String(initial.priceMax));
  const [condition, setCondition] = useState(initial.condition);
  const [size, setSize] = useState(initial.size ?? "");
  const [deadline, setDeadline] = useState(initial.deadline);
  const [phone, setPhone] = useState(initial.userPhone ?? "");
  const [instagram, setInstagram] = useState(initial.userInstagram ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) { setError("Description is required."); return; }
    if (!priceMin || !priceMax) { setError("Please enter a price range."); return; }
    if (Number(priceMin) >= Number(priceMax)) { setError("Max must be greater than min."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/sourcing/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          description: description.trim(),
          priceMin: Number(priceMin),
          priceMax: Number(priceMax),
          condition,
          size: size.trim() || null,
          deadline,
          phone: phone.trim() || null,
          instagram: instagram.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save changes.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs uppercase tracking-widest text-[#5D0F17]/40 hover:text-[#5D0F17] underline underline-offset-4 transition"
      >
        Edit request
      </button>
    );
  }

  return (
    <div className="border border-[#5D0F17]/15 bg-[#D8CABD]/10 p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 font-medium">Edit Request</p>
        <button
          onClick={() => setOpen(false)}
          className="text-xs uppercase tracking-widest text-[#5D0F17]/40 hover:text-[#5D0F17] transition"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Description */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-[#5D0F17]/20 bg-transparent px-4 py-3 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] resize-none transition"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">
            Budget <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5D0F17]/40">$</span>
              <input
                type="number"
                min={0}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full border border-[#5D0F17]/20 bg-transparent pl-7 pr-4 py-2.5 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] transition"
              />
            </div>
            <span className="text-[#5D0F17]/40 text-sm">to</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5D0F17]/40">$</span>
              <input
                type="number"
                min={1}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full border border-[#5D0F17]/20 bg-transparent pl-7 pr-4 py-2.5 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] transition"
              />
            </div>
          </div>
        </div>

        {/* Condition + Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">Condition</label>
            <div className="flex flex-col gap-1.5">
              {CONDITIONS.map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="edit-condition"
                    value={c}
                    checked={condition === c}
                    onChange={() => setCondition(c)}
                    className="accent-[#5D0F17]"
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">
              Size <span className="normal-case tracking-normal text-[#5D0F17]/30">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. M, US 8"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full border border-[#5D0F17]/20 bg-transparent px-4 py-2.5 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] transition"
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">Needed by</label>
          <div className="flex flex-wrap gap-2">
            {DEADLINES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeadline(d)}
                className={`text-xs uppercase tracking-[0.12em] px-3 py-1.5 border transition ${
                  deadline === d
                    ? "border-[#5D0F17] bg-[#5D0F17] text-[#F7F3EA]"
                    : "border-[#5D0F17]/20 hover:border-[#5D0F17]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">
              Phone <span className="normal-case tracking-normal text-[#5D0F17]/30">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+1 212 555 0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[#5D0F17]/20 bg-transparent px-4 py-2.5 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] transition"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-2">
              Instagram <span className="normal-case tracking-normal text-[#5D0F17]/30">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="@handle"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full border border-[#5D0F17]/20 bg-transparent px-4 py-2.5 text-sm text-[#5D0F17] focus:outline-none focus:border-[#5D0F17] transition"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="text-sm uppercase tracking-[0.15em] px-8 py-3 bg-[#5D0F17] text-[#F7F3EA] hover:bg-[#5D0F17]/85 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-[#5D0F17]/40 hover:text-[#5D0F17] transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
