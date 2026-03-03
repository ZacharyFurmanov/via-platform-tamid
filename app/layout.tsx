export const dynamic = "force-dynamic";

import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Script from "next/script";
import { GiveawayProvider } from "./components/GiveawayProvider";
import { SignUpProvider } from "./components/SignUpProvider";
import { AuthProvider } from "./components/AuthProvider";
import { FavoritesProvider } from "./components/FavoritesProvider";
import { FriendsProvider } from "./components/FriendsProvider";
import { CartProvider } from "./components/CartProvider";
import ScrollToTop from "./components/ScrollToTop";

export const metadata: Metadata = {
  title: "VIA",
  description: "Vintage & secondhand, worldwide.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "VIA",
    description: "Vintage & secondhand, worldwide.",
    url: "https://theviaplatform.com",
    siteName: "VIA",
    images: [
      {
        url: "https://theviaplatform.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "VIA — Vintage & Secondhand",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIA",
    description: "Vintage & secondhand, worldwide.",
    images: ["https://theviaplatform.com/og-image.png"],
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
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-ZDBBYJCNVT"
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-ZDBBYJCNVT');
        `}
      </Script>

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
          <FavoritesProvider>
            <FriendsProvider>
            <CartProvider>
              <SignUpProvider>
              {/* <GiveawayProvider> */}
                <ScrollToTop />
                <Header />
                <main className="pt-[104px]">{children}</main>
                <Footer />
              {/* </GiveawayProvider> */}
              </SignUpProvider>
            </CartProvider>
            </FriendsProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
