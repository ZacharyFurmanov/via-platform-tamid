import { ImageResponse } from "next/og";
import { getProductById } from "@/app/lib/db";

export const runtime = "nodejs";
export const alt = "Product on VYA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori (next/og) can't decode WebP, and some store CDNs (e.g. Squarespace)
// serve WebP via content negotiation. Fetch the image ourselves forcing a
// non-WebP format and inline it as a data URI so the preview always renders;
// fall back to the branded placeholder if it isn't JPEG/PNG.
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

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
 const { id: compositeId } = await params;
 const match = compositeId.match(/^(.+)-(\d+)$/);

 let imageUrl: string | null = null;
 if (match) {
  const dbId = parseInt(match[2], 10);
  if (!isNaN(dbId)) {
   try {
    const product = await getProductById(dbId);
    if (product?.image) imageUrl = await fetchAsDataUri(product.image);
   } catch {}
  }
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
