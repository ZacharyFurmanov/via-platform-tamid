export type ActivityType = "favorite_product" | "favorite_store" | "shop_click";

export interface FriendProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
}

export interface FriendRequest {
  id: number;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  // Populated from join
  from_user?: FriendProfile;
  to_user?: FriendProfile;
}

export interface ActivityFeedItem {
  id: number;
  user_id: string;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
  // Populated from join
  user_name: string | null;
  user_image: string | null;
}
