import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/app/lib/base-url";
import { stores } from "@/app/lib/stores";

export const runtime = "nodejs";
export const alt = "Store on VYA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = stores.find((s) => s.slug === slug);

  const BASE_URL = getBaseUrl();
  const name = store?.name ?? "VYA Store";
  const location = store?.location ?? "";
  const imageUrl = store?.image
    ? store.image.startsWith("http")
      ? store.image
      : `${BASE_URL}${store.image}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#FFFDF8",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Store image — full bleed left half */}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{
              width: 630,
              height: 630,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 630,
              height: 630,
              backgroundColor: "#D8CABD",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 80, color: "#5D0F17", opacity: 0.3 }}>VYA</span>
          </div>
        )}

        {/* Right side — store info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 56px",
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#5D0F17",
              opacity: 0.45,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
            }}
          >
            Shop on VYA
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span
              style={{
                fontSize: name.length > 24 ? 34 : 42,
                color: "#5D0F17",
                lineHeight: 1.2,
                fontWeight: 400,
              }}
            >
              {name}
            </span>
            {location && (
              <span
                style={{
                  fontSize: 16,
                  color: "#5D0F17",
                  opacity: 0.5,
                  letterSpacing: "0.05em",
                }}
              >
                {location}
              </span>
            )}
          </div>

          <span
            style={{
              fontSize: 14,
              color: "#5D0F17",
              opacity: 0.4,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
            }}
          >
            vyaplatform.com
          </span>
        </div>
      </div>
    ),
    size
  );
}
