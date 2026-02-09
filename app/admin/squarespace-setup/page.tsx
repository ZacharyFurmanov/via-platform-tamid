"use client";

import Link from "next/link";
import { useState } from "react";

export default function SquarespaceSetupPage() {
  const [storeSlug, setStoreSlug] = useState("");
  const [storeName, setStoreName] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";

  // Code block 1: goes in Header
  const headerCode = `<!-- VIA Click Tracking -->
<script>
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var clickId = urlParams.get('via_click_id');
  if (clickId) {
    document.cookie = 'via_click_id=' + clickId + ';max-age=2592000;path=/;SameSite=Lax';
  }
})();
</script>`;

  // Code block 2: goes in Order Confirmation
  const orderConfirmationCode = `<!-- VIA Order Tracking -->
<script>
(function() {
  var viaClickId = null;
  var cookies = document.cookie.split(';');
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    if (cookie.indexOf('via_click_id=') === 0) {
      viaClickId = cookie.substring(13);
      break;
    }
  }

  if (typeof Squarespace !== 'undefined' && Squarespace.commerce) {
    Squarespace.commerce.onOrderComplete(function(orderData) {
      var payload = {
        orderId: orderData.orderNumber,
        orderTotal: orderData.grandTotal.value,
        currency: orderData.grandTotal.currency,
        items: orderData.items.map(function(item) {
          return {
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice.value
          };
        }),
        viaClickId: viaClickId,
        storeSlug: '${storeSlug || "your-store-slug"}',
        storeName: '${storeName || "Your Store Name"}'
      };

      fetch('${baseUrl}/api/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    });
  }
})();
</script>`;

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Link
              href="/admin/analytics"
              className="text-neutral-400 hover:text-black transition-colors"
            >
              &larr; Back to Analytics
            </Link>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Connect Your Squarespace Store
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Follow these steps to connect your Squarespace store to VIA.
            No coding knowledge needed — just copy, paste, and save.
          </p>
        </div>
      </section>

      {/* Time Estimate */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-sm text-neutral-600">
            This takes about <strong className="text-black">5 minutes</strong>. You&apos;ll just be copying and pasting
            two blocks of text into your Squarespace settings.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-6">

          {/* Before you start */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">Before You Start</h2>
            <p className="text-neutral-600 mb-4">
              You&apos;ll need access to your Squarespace website settings.
              Make sure you&apos;re logged in as an admin on your Squarespace site.
            </p>
            <div className="bg-neutral-50 border border-neutral-200 p-5">
              <p className="text-sm text-neutral-600">
                <strong className="text-black">Note:</strong> This requires a Squarespace Business plan or higher.
                If you&apos;re on a Personal plan, you&apos;ll need to upgrade first.
              </p>
            </div>
          </div>

          {/* Step 1: Enter store info */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                1
              </span>
              <h2 className="text-xl sm:text-2xl font-serif">Enter Your Store Name</h2>
            </div>
            <p className="text-neutral-600 mb-6">
              Type in your store details below. This will automatically fill in the code you need to copy.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store Name <span className="text-neutral-400 font-normal">(how it appears on VIA)</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. My Vintage Store"
                  className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store ID <span className="text-neutral-400 font-normal">(lowercase, use dashes instead of spaces)</span>
                </label>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="e.g. my-vintage-store"
                  className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none text-base"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Copy Code Block 1 */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-serif">Paste the First Code Block</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-neutral-50 border border-neutral-200 p-5 space-y-4">
                <p className="text-sm font-medium">Here&apos;s what to do:</p>
                <ol className="space-y-3 text-sm text-neutral-600">
                  <li className="flex gap-3">
                    <span className="font-medium text-black flex-shrink-0">a.</span>
                    <span>In your Squarespace admin, go to <strong className="text-black">Settings</strong> &rarr; <strong className="text-black">Advanced</strong> &rarr; <strong className="text-black">Code Injection</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-black flex-shrink-0">b.</span>
                    <span>You&apos;ll see a box labeled <strong className="text-black">Header</strong> at the top of the page</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-black flex-shrink-0">c.</span>
                    <span>Click the <strong className="text-black">Copy</strong> button below, then paste it into that Header box</span>
                  </li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-neutral-900 text-neutral-100 p-4 text-xs overflow-x-auto rounded">
                  <code>{headerCode}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(headerCode)}
                  className="absolute top-3 right-3 px-4 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200 transition rounded"
                >
                  Copy
                </button>
              </div>

              <p className="text-neutral-400 text-xs">
                Don&apos;t worry about understanding this code — just copy and paste it exactly as-is.
              </p>
            </div>
          </div>

          {/* Step 3: Copy Code Block 2 */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                3
              </span>
              <h2 className="text-xl sm:text-2xl font-serif">Paste the Second Code Block</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-neutral-50 border border-neutral-200 p-5 space-y-4">
                <p className="text-sm font-medium">On the same Code Injection page:</p>
                <ol className="space-y-3 text-sm text-neutral-600">
                  <li className="flex gap-3">
                    <span className="font-medium text-black flex-shrink-0">a.</span>
                    <span>Scroll down until you see a box labeled <strong className="text-black">Order Confirmation Page</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium text-black flex-shrink-0">b.</span>
                    <span>Click the <strong className="text-black">Copy</strong> button below, then paste it into that Order Confirmation Page box</span>
                  </li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-neutral-900 text-neutral-100 p-4 text-xs overflow-x-auto rounded">
                  <code>{orderConfirmationCode}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(orderConfirmationCode)}
                  className="absolute top-3 right-3 px-4 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200 transition rounded"
                >
                  Copy
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Quick recap:</strong> The first code block goes in the <strong>Header</strong> box.
                  The second code block goes in the <strong>Order Confirmation Page</strong> box.
                  They&apos;re on the same page in Squarespace, just scroll down.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Save */}
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif">Hit Save</h2>
            </div>
            <p className="text-neutral-600">
              Click the <strong>Save</strong> button at the top of the Squarespace Code Injection page.
              That&apos;s it — you&apos;re all set!
            </p>
            <div className="bg-green-50 border border-green-200 p-4 mt-4">
              <p className="text-sm text-green-800">
                Once saved, VIA will automatically know when a customer we send to your store makes a purchase.
                You don&apos;t need to do anything else.
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-neutral-200 my-12 sm:my-16" />

          {/* FAQ */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Will this affect my website speed or checkout?</h3>
                <p className="text-neutral-600 text-sm">
                  No. It&apos;s a tiny piece of code that runs in the background. Your customers won&apos;t notice anything different.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Does this track all my customers?</h3>
                <p className="text-neutral-600 text-sm">
                  No — only customers who came from VIA. If someone finds your store on their own,
                  nothing happens. We never collect customer names, emails, or personal info.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">What if a customer browses other products after clicking from VIA?</h3>
                <p className="text-neutral-600 text-sm">
                  If a customer clicks through from VIA and ends up buying a different item on your store,
                  VIA still gets credit. The tracking lasts for 30 days from their first click.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Can I remove this later?</h3>
                <p className="text-neutral-600 text-sm">
                  Yes. Just go back to Code Injection and delete the code from both boxes. No changes
                  to your site will remain.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="border-t border-neutral-200 pt-8">
            <p className="text-neutral-600 text-sm">
              Stuck or have questions? Email us at{" "}
              <a href="mailto:partnerships@theviaplatform.com" className="text-black underline">
                partnerships@theviaplatform.com
              </a>
              {" "}and we&apos;ll walk you through it.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
