import { Suspense } from "react";
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
 title: "Join VYA — The first online department store for vintage and secondhand.",
 description: "Discover the best vintage and secondhand stores, all in one place. Sign in or create an account to be added to our pilot.",
 openGraph: {
 title: "The first online department store for vintage and secondhand.",
 description: "Discover the best vintage and secondhand stores, all in one place. Sign in or create an account to be added to our pilot.",
 url: "https://vyaplatform.com/login",
 siteName: "VYA",
 images: [
 {
 url: "https://vyaplatform.com/og-image.png",
 width: 1200,
 height: 630,
 alt: "VYA — The first online department store for vintage and secondhand.",
 },
 ],
 type: "website",
 },
 twitter: {
 card: "summary_large_image",
 title: "The first online department store for vintage and secondhand.",
 description: "Discover the best vintage and secondhand stores, all in one place. Sign in or create an account to be added to our pilot.",
 images: ["https://vyaplatform.com/og-image.png"],
 },
};

export default function LoginPage() {
 return (
 <Suspense fallback={null}>
 <LoginClient />
 </Suspense>
 );
}
