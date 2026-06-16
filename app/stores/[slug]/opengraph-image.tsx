import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/app/lib/base-url";
import { stores } from "@/app/lib/stores";

export const runtime = "nodejs";
export const alt = "Store on VYA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori (next/og) can't decode WebP. Fetch the image ourselves forcing a
// non-WebP format and inline it as a data URI; fall back to the branded
// placeholder if it isn't JPEG/PNG.
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "image/jpeg,image/png" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!/image\/(jpeg|png)/.test(type)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = stores.find((s) => s.slug === slug);
  const BASE_URL = getBaseUrl();

  let imageUrl: string | null = null;
  if (store?.image) {
    const absolute = store.image.startsWith("http") ? store.image : `${BASE_URL}${store.image}`;
    imageUrl = await fetchAsDataUri(absolute);
  }

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "1200px", height: "630px", backgroundColor: "#FFFDF8" }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: "1200px", height: "630px", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "1200px",
              height: "630px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#D8CABD",
            }}
          >
            <span style={{ fontSize: 120, color: "#5D0F17", opacity: 0.3, fontFamily: "serif" }}>VYA</span>
          </div>
        )}
      </div>
    ),
    size
  );
}
