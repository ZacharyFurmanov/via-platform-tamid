"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type Collection = { id: number; name: string; itemCount: number; coverImage: string | null };

type Props = {
  productId: number;
  snapshot?: Record<string, unknown>;
};

export default function AddToCollectionButton({ productId, snapshot }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !session?.user) return;
    setLoading(true);
    Promise.all([
      fetch("/api/collections").then((r) => r.json()),
    ]).then(([data]) => {
      setCollections(data.collections ?? []);
    }).finally(() => setLoading(false));
  }, [open, session?.user]);

  if (!session?.user) return null;

  const toggle = async (collectionId: number) => {
    const alreadySaved = saved.has(collectionId);
    if (alreadySaved) {
      await fetch(`/api/collections/${collectionId}/items/${productId}`, { method: "DELETE" });
      setSaved((prev) => { const n = new Set(prev); n.delete(collectionId); return n; });
    } else {
      await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, snapshot }),
      });
      setSaved((prev) => new Set([...prev, collectionId]));
    }
  };

  const createAndSave = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.collection) {
      const col = { ...data.collection, itemCount: 0 };
      setCollections((prev) => [col, ...prev]);
      await fetch(`/api/collections/${data.collection.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, snapshot }),
      });
      setSaved((prev) => new Set([...prev, data.collection.id]));
    }
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full border border-[#5D0F17]/20 text-[#5D0F17] py-3 px-4 text-sm uppercase tracking-wide hover:border-[#5D0F17] transition mt-2"
        aria-label="Save to collection"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Save to Collection
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#F7F3EA] border border-[#5D0F17]/20 shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-[#5D0F17]/50">Loading...</p>
          ) : (
            <>
              {collections.length === 0 && (
                <p className="px-4 pt-4 pb-2 text-sm text-[#5D0F17]/50">No collections yet.</p>
              )}
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggle(col.id)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#D8CABD]/30 transition"
                >
                  {/* Tiny cover */}
                  <div className="w-8 h-8 bg-[#D8CABD]/40 shrink-0 overflow-hidden">
                    {col.coverImage && (
                      <img src={col.coverImage} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#5D0F17] truncate">{col.name}</p>
                    <p className="text-[10px] text-[#5D0F17]/40">{col.itemCount} items</p>
                  </div>
                  {saved.has(col.id) && (
                    <svg className="w-4 h-4 text-[#5D0F17] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  )}
                </button>
              ))}

              {/* New collection input */}
              <div className="border-t border-[#5D0F17]/10 p-3 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createAndSave(); }}
                  placeholder="New collection…"
                  className="flex-1 text-sm bg-transparent border-b border-[#5D0F17]/20 focus:border-[#5D0F17] outline-none py-1 text-[#5D0F17] placeholder:text-[#5D0F17]/30"
                />
                <button
                  onClick={createAndSave}
                  disabled={creating || !newName.trim()}
                  className="text-xs uppercase tracking-wide text-[#5D0F17] disabled:opacity-30"
                >
                  {creating ? "..." : "Add"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
