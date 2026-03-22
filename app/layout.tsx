export const dynamic = "force-dynamic";

import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { AdminHide, MainWrapper } from "./components/RootLayoutWrapper";
import Script from "next/script";
import { SignUpProvider } from "./components/SignUpProvider";
import { AuthProvider } from "./components/AuthProvider";
import { FavoritesProvider } from "./components/FavoritesProvider";
import { FriendsProvider } from "./components/FriendsProvider";
import { CartProvider } from "./components/CartProvider";
import ScrollToTop from "./components/ScrollToTop";
import FeedbackModal from "./components/FeedbackModal";
import { Analytics } from "@vercel/analytics/next";
import FirebaseAnalyticsProvider from "./components/FirebaseAnalyticsProvider";

export const metadata: Metadata = {
  title: "VYA — Vintage & Secondhand Platform",
  description: "Discover the best independent vintage and secondhand stores worldwide. Shop curated clothing, bags, shoes, and accessories from trusted stores on VYA.",
  keywords: ["vintage", "secondhand", "vintage clothing", "vintage platform", "independent vintage stores", "VYA platform", "designer vintage", "pre-loved fashion"],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "VYA — Vintage & Secondhand Platform",
    description: "Discover the best independent vintage and secondhand stores worldwide. Shop curated clothing, bags, shoes, and accessories from trusted stores.",
    url: "https://vyaplatform.com",
    siteName: "VYA",
    images: [
      {
        url: "https://vyaplatform.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "VYA — Vintage & Secondhand Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VYA — Vintage & Secondhand Platform",
    description: "Discover the best independent vintage and secondhand stores worldwide.",
    images: ["https://vyaplatform.com/og-image.png"],
  },
  other: {
    "p:domain_verify": "dcf6fca818d0ee26a40db310f2b0a1ba",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* Pinterest Tag */}
      <Script id="pinterest-tag" strategy="afterInteractive">
        {`
          !function(e){if(!window.pintrk){window.pintrk=function(){
          window.pintrk.queue.push(Array.prototype.slice.call(arguments))};
          var n=window.pintrk;n.queue=[],n.version="3.0";
          var t=document.createElement("script");
          t.async=!0,t.src=e;
          var r=document.getElementsByTagName("script")[0];
          r.parentNode.insertBefore(t,r)}}
          ("https://s.pinimg.com/ct/core.js");

          pintrk('load', '2614237582914');
          pintrk('page');
        `}
      </Script>

      <body className="bg-[#F7F3EA] text-[#5D0F17]">
        <AuthProvider>
          <Suspense fallback={null}>
            <FirebaseAnalyticsProvider />
          </Suspense>
          <FavoritesProvider>
            <FriendsProvider>
            <CartProvider>
              <SignUpProvider>
              {/* <GiveawayProvider> */}
                <ScrollToTop />
                <FeedbackModal />
                <AdminHide><Header /></AdminHide>
                <MainWrapper>{children}</MainWrapper>
                <AdminHide><Footer /></AdminHide>
              {/* </GiveawayProvider> */}
              <Analytics />
              </SignUpProvider>
            </CartProvider>
            </FriendsProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
