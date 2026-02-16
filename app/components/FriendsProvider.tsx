"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { FriendProfile, FriendRequest } from "@/app/lib/friends-types";

type FriendsContextType = {
  friends: FriendProfile[];
  pendingCount: number;
  loaded: boolean;
  sendRequest: (userId: string) => Promise<{ status: string }>;
  acceptRequest: (requestId: number) => Promise<void>;
  declineRequest: (requestId: number) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const FriendsContext = createContext<FriendsContextType>({
  friends: [],
  pendingCount: 0,
  loaded: false,
  sendRequest: async () => ({ status: "error" }),
  acceptRequest: async () => {},
  declineRequest: async () => {},
  removeFriend: async () => {},
  refresh: async () => {},
});

export function useFriends() {
  return useContext(FriendsContext);
}

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/friends/requests"),
      ]);
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setPendingCount(data.incoming?.length || 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoaded(true);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) {
      setFriends([]);
      setPendingCount(0);
      setLoaded(false);
      return;
    }
    fetchData();
  }, [session?.user, fetchData]);

  const sendRequest = useCallback(async (userId: string) => {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.status === "accepted") {
      await fetchData();
    }
    return data;
  }, [fetchData]);

  const acceptRequest = useCallback(async (requestId: number) => {
    await fetch(`/api/friends/requests/${requestId}/accept`, { method: "POST" });
    await fetchData();
  }, [fetchData]);

  const declineRequest = useCallback(async (requestId: number) => {
    await fetch(`/api/friends/requests/${requestId}/decline`, { method: "POST" });
    await fetchData();
  }, [fetchData]);

  const removeFriend = useCallback(async (friendId: string) => {
    await fetch(`/api/friends/${friendId}`, { method: "DELETE" });
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }, []);

  return (
    <FriendsContext.Provider
      value={{ friends, pendingCount, loaded, sendRequest, acceptRequest, declineRequest, removeFriend, refresh: fetchData }}
    >
      {children}
    </FriendsContext.Provider>
  );
}
