"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFriends } from "@/app/components/FriendsProvider";
import type { FriendProfile, FriendRequest, ActivityFeedItem } from "@/app/lib/friends-types";

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Avatar({ name, image, size = "md" }: { name: string | null; image: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const textSize = size === "sm" ? "text-sm" : "text-lg";
  if (image) {
    return <img src={image} alt="" className={`${dim} rounded-full`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-neutral-100 flex items-center justify-center`}>
      <span className={`${textSize} font-serif text-black/40`}>
        {(name?.[0] || "?").toUpperCase()}
      </span>
    </div>
  );
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { friends, sendRequest, acceptRequest, declineRequest, removeFriend, refresh } = useFriends();

  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<{ found: boolean; user?: { id: string; name: string | null; image: string | null } } | null>(null);
  const [searching, setSearching] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string>("");

  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests");
      if (res.ok) {
        const data = await res.json();
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
      }
    } catch {}
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/activity");
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user) {
      fetchRequests();
      fetchFeed();
    }
  }, [session, status, router, fetchRequests, fetchFeed]);

  async function handleSearch() {
    if (!searchPhone.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setRequestStatus("");
    try {
      const res = await fetch(`/api/friends/search?phone=${encodeURIComponent(searchPhone)}`);
      const data = await res.json();
      setSearchResult(data);
    } catch {
      setSearchResult({ found: false });
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(userId: string) {
    setRequestStatus("");
    const result = await sendRequest(userId);
    setRequestStatus(result.status);
    await fetchRequests();
  }

  async function handleAccept(requestId: number) {
    await acceptRequest(requestId);
    await fetchRequests();
    await fetchFeed();
  }

  async function handleDecline(requestId: number) {
    await declineRequest(requestId);
    await fetchRequests();
  }

  async function handleRemove(friendId: string) {
    await removeFriend(friendId);
  }

  function handleInvite() {
    const text = "Join me on VIA — curated vintage & resale from independent stores across the country, all in one place! https://theviaplatform.com";
    if (navigator.share) {
      navigator.share({ title: "Join VIA", text }).catch(() => {});
    } else {
      const normalized = searchPhone.replace(/\D/g, "");
      window.open(`sms:${normalized}?body=${encodeURIComponent(text)}`);
    }
  }

  function activityDescription(item: ActivityFeedItem): string {
    const meta = item.metadata;
    switch (item.activity_type) {
      case "favorite_product":
        return `hearted a product${meta.productTitle ? `: ${meta.productTitle}` : ""}`;
      case "favorite_store":
        return `hearted ${meta.storeName || meta.storeSlug || "a store"}`;
      case "shop_click":
        return `shopped ${meta.productTitle || "a product"}${meta.storeName ? ` from ${meta.storeName}` : ""}`;
      default:
        return "did something";
    }
  }

  if (status === "loading") return null;

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <h1 className="font-serif text-3xl mb-12">Friends</h1>

        {/* Find Friends */}
        <section className="mb-12">
          <h2 className="font-serif text-xl mb-4">Find Friends</h2>
          <p className="text-sm text-black/50 mb-4">Search by phone number to find friends on VIA.</p>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. +1 555 123 4567"
              className="border border-neutral-300 px-3 py-2 text-sm w-64 outline-none focus:border-black transition"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="text-sm uppercase tracking-wide px-4 py-2 border border-black hover:bg-black hover:text-white transition disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResult && (
            <div className="border border-neutral-200 p-4">
              {searchResult.found && searchResult.user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={searchResult.user.name} image={searchResult.user.image} />
                    <span className="text-sm font-medium">{searchResult.user.name || "VIA User"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requestStatus && (
                      <span className="text-xs text-black/50 capitalize">{requestStatus.replace("_", " ")}</span>
                    )}
                    {!requestStatus && (
                      <button
                        onClick={() => handleSendRequest(searchResult.user!.id)}
                        className="text-sm uppercase tracking-wide px-3 py-1.5 bg-black text-white hover:bg-black/80 transition"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black/50">No user found with this number</span>
                  <button
                    onClick={handleInvite}
                    className="text-sm uppercase tracking-wide px-3 py-1.5 border border-black hover:bg-black hover:text-white transition"
                  >
                    Invite to VIA
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Friend Requests */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <section className="mb-12">
            <h2 className="font-serif text-xl mb-4">Friend Requests</h2>

            {incoming.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-wide text-black/50 mb-3">Incoming</h3>
                <div className="space-y-3">
                  {incoming.map((req) => (
                    <div key={req.id} className="flex items-center justify-between border border-neutral-200 p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={req.from_user?.name || null} image={req.from_user?.image || null} size="sm" />
                        <span className="text-sm">{req.from_user?.name || req.from_user?.email || "Someone"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="text-sm uppercase tracking-wide px-3 py-1 bg-black text-white hover:bg-black/80 transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          className="text-sm uppercase tracking-wide px-3 py-1 border border-neutral-300 hover:border-black transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-black/50 mb-3">Sent</h3>
                <div className="space-y-3">
                  {outgoing.map((req) => (
                    <div key={req.id} className="flex items-center justify-between border border-neutral-200 p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={req.to_user?.name || null} image={req.to_user?.image || null} size="sm" />
                        <span className="text-sm">{req.to_user?.name || req.to_user?.email || "Someone"}</span>
                      </div>
                      <span className="text-xs text-black/40 uppercase tracking-wide">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* My Friends */}
        <section className="mb-12">
          <h2 className="font-serif text-xl mb-4">My Friends</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-black/50">
              No friends yet. Search by phone number above to find people you know.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between border border-neutral-200 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={friend.name} image={friend.image} />
                    <div>
                      <span className="text-sm font-medium block">{friend.name || "VIA User"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(friend.id)}
                    className="text-xs uppercase tracking-wide text-black/40 hover:text-red-600 transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Friends Activity */}
        <section>
          <h2 className="font-serif text-xl mb-4">Friends Activity</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-black/50">
              {friends.length === 0
                ? "Add friends to see what they're hearting and shopping."
                : "No activity from your friends yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {feed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 border-b border-neutral-100">
                  <Avatar name={item.user_name} image={item.user_image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.user_name || "A friend"}</span>{" "}
                      {activityDescription(item)}
                    </p>
                    <span className="text-xs text-black/40">{timeAgo(item.created_at)}</span>
                  </div>
                  {typeof item.metadata.productImage === "string" && (
                    <img
                      src={item.metadata.productImage}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
