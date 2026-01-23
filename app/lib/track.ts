import { randomBytes } from "crypto";

type EventPayload = Record<string, unknown>;

export function track(event: string, payload: EventPayload) {
  // V1: simple console log
  console.log(`[TRACK] ${event}`, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

export type ClickRecord = {
  clickId: string;
  timestamp: string;
  productId: string;
  productName: string;
  store: string;
  storeSlug: string;
  externalUrl: string;
};

/**
 * Generates a unique click ID
 */
export function generateClickId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Creates a tracking URL for a product
 */
export function createTrackingUrl(
  productId: string,
  productName: string,
  store: string,
  storeSlug: string,
  externalUrl: string
): string {
  const params = new URLSearchParams({
    pid: productId,
    pn: productName,
    s: store,
    ss: storeSlug,
    url: externalUrl,
  });
  return `/api/track?${params.toString()}`;
}
