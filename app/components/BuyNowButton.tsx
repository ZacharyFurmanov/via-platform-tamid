"use client";

type BuyNowButtonProps = {
  compositeId: string;
  title: string;
  price: string;
  image: string;
  storeName: string;
  storeSlug: string;
  externalUrl: string;
  checkoutUrl: string;
};

export default function BuyNowButton({
  compositeId,
  title,
  price,
  image,
  storeName,
  storeSlug,
  externalUrl,
  checkoutUrl,
}: BuyNowButtonProps) {
  const trackUrl = (() => {
    const params = new URLSearchParams({
      pid: compositeId,
      pn: title,
      s: storeName,
      ss: storeSlug,
      url: checkoutUrl || externalUrl,
    });
    return `/api/track?${params.toString()}`;
  })();

  const handleClick = () => {
    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      trackUrl,
      "_blank",
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`
    );
  };

  return (
    <button
      onClick={handleClick}
      className="block w-full bg-[#5D0F17] text-[#F7F3EA] py-4 text-sm uppercase tracking-wide text-center hover:bg-[#5D0F17]/85 transition"
    >
      Buy Now
    </button>
  );
}
