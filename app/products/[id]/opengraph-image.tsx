import { ImageResponse } from "next/og";
import { getProductById } from "@/app/lib/db";

export const runtime = "nodejs";
export const alt = "Product on VYA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: compositeId } = await params;
  const match = compositeId.match(/^(.+)-(\d+)$/);

  let title = "VYA — Vintage & Secondhand";
  let storeName = "";
  let price = "";
  let imageUrl: string | null = null;

  if (match) {
    const dbId = parseInt(match[2], 10);
    if (!isNaN(dbId)) {
      try {
        const product = await getProductById(dbId);
        if (product) {
          title = product.title;
          storeName = product.store_name;
          price = `$${Math.round(Number(product.price))}`;
          imageUrl = product.image ?? null;
        }
      } catch {}
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#F7F3EA",
          fontFamily: "serif",
        }}
      >
        {/* Product image — left half */}
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

        {/* Right side — product info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 56px",
            flex: 1,
          }}
        >
          {/* Store name */}
          {storeName && (
            <span
              style={{
                fontSize: 18,
                color: "#5D0F17",
                opacity: 0.5,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
              }}
            >
              {storeName}
            </span>
          )}

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span
              style={{
                fontSize: title.length > 60 ? 28 : 36,
                color: "#5D0F17",
                lineHeight: 1.3,
                fontWeight: 400,
              }}
            >
              {title}
            </span>

            {price && (
              <span
                style={{
                  fontSize: 36,
                  color: "#5D0F17",
                  fontWeight: 600,
                }}
              >
                {price}
              </span>
            )}
          </div>

          {/* VYA branding */}
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
