import { ImageResponse } from "next/og";
import { getAllEditorsPicks, COLLECTIONS } from "@/app/lib/editors-picks-db";

export const runtime = "nodejs";
export const alt = "Collection on VYA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  const name = collection?.name ?? "Collection";
  const curatedBy = collection?.curatedBy ?? null;

  let images: string[] = [];
  try {
    const picks = await getAllEditorsPicks(slug);
    images = picks
      .map((p) => p.product.image)
      .filter((img): img is string => !!img)
      .slice(0, 4);
  } catch {}

  const [img0, img1, img2, img3] = images;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#FFFDF8",
          fontFamily: "serif",
        }}
      >
        {/* Left: 2×2 product grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 630,
            height: 630,
            flexShrink: 0,
          }}
        >
          {[img0, img1, img2, img3].map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                style={{ width: 315, height: 315, objectFit: "cover" }}
              />
            ) : (
              <div
                key={i}
                style={{ width: 315, height: 315, backgroundColor: "#D8CABD" }}
              />
            )
          )}
        </div>

        {/* Right: collection info */}
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
            Collection
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span
              style={{
                fontSize: name.length > 24 ? 30 : 38,
                color: "#5D0F17",
                lineHeight: 1.25,
                fontWeight: 400,
              }}
            >
              {name}
            </span>
            {curatedBy && (
              <span
                style={{
                  fontSize: 15,
                  color: "#5D0F17",
                  opacity: 0.5,
                  letterSpacing: "0.04em",
                }}
              >
                Curated by {curatedBy}
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
