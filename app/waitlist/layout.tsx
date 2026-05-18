import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join VYA — Win a $1,000 Vintage Shopping Spree",
  description: "Shop vintage & secondhand from the best independent stores, all in one place. Join the waitlist for early access and enter to win a $1,000 shopping spree.",
  openGraph: {
    title: "Win a $1,000 Vintage Shopping Spree",
    description: "Join VYA — the world's best vintage, all in one place. Sign up for early access and enter our giveaway.",
    url: "https://vyaplatform.com/waitlist",
    siteName: "VYA",
    images: [
      {
        url: "https://vyaplatform.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "VYA — Win a $1,000 Vintage Shopping Spree",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Win a $1,000 Vintage Shopping Spree",
    description: "Join VYA — the world's best vintage, all in one place. Sign up for early access and enter our giveaway.",
    images: ["https://vyaplatform.com/og-image.png"],
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-[200] bg-[#F7F3EA] overflow-y-auto !pt-0">{children}</div>;
}
