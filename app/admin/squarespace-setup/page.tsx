"use client";

import Link from "next/link";
import { useState } from "react";

export default function SquarespaceSetupPage() {
  const [storeSlug, setStoreSlug] = useState("");
  const [storeName, setStoreName] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";

  const pixelCode = `<!-- VIA Conversion Tracking -->
<script>
(function() {
  // Get VIA click ID from URL or cookie
  var viaClickId = null;
  var urlParams = new URLSearchParams(window.location.search);
  var clickIdFromUrl = urlParams.get('via_click_id');

  if (clickIdFromUrl) {
    viaClickId = clickIdFromUrl;
    // Store in cookie for 30 days
    document.cookie = 'via_click_id=' + clickIdFromUrl + ';max-age=2592000;path=/';
  } else {
    // Try to get from cookie
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.indexOf('via_click_id=') === 0) {
        viaClickId = cookie.substring(13);
        break;
      }
    }
  }

  // Only track if we have order data (on confirmation page)
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
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Link
              href="/admin/analytics"
              className="text-neutral-400 hover:text-black transition-colors"
            >
              ← Back to Analytics
            </Link>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Squarespace Store Setup
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Add simple conversion tracking to your Squarespace store.
          </p>
        </div>
      </section>

      {/* Time Estimate */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm">
            <span className="font-medium">⏱ Setup time:</span>{" "}
            <span className="text-neutral-600">~5 minutes</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* How It Works */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">How It Works</h2>
            <p className="text-neutral-600 mb-4">
              When a customer clicks from VIA to your store, we add a tracking ID to the URL.
              The pixel below captures this ID and sends conversion data back to VIA when
              an order is completed.
            </p>
            <div className="bg-green-50 border border-green-200 p-4 text-sm">
              <p className="text-green-800">
                <strong>Privacy-friendly:</strong> We only track orders that originated from VIA clicks.
                No personal customer data is collected—just order totals and product names for
                commission calculation.
              </p>
            </div>
          </div>

          {/* Configure Your Pixel */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">1. Configure Your Pixel</h2>
            <p className="text-neutral-600 mb-4 text-sm">
              Enter your store details below to generate your custom tracking code:
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store Slug <span className="text-neutral-400 font-normal">(lowercase, no spaces)</span>
                </label>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="my-vintage-store"
                  className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Store Name <span className="text-neutral-400 font-normal">(as shown on VIA)</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="My Vintage Store"
                  className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Copy the Code */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">2. Copy the Tracking Code</h2>
            <div className="relative">
              <pre className="bg-neutral-900 text-neutral-100 p-4 text-xs overflow-x-auto rounded">
                <code>{pixelCode}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(pixelCode)}
                className="absolute top-3 right-3 px-3 py-1.5 bg-white text-black text-xs hover:bg-neutral-200 transition"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Add to Squarespace */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">3. Add to Squarespace</h2>
            <div className="space-y-6">
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    A
                  </span>
                  <h3 className="text-lg font-medium">Go to Code Injection</h3>
                </div>
                <div className="text-neutral-600 text-sm space-y-2">
                  <p>In your Squarespace admin:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to <strong>Settings → Advanced → Code Injection</strong></li>
                    <li>Scroll down to the <strong>Order Confirmation Page</strong> section</li>
                  </ol>
                </div>
              </div>

              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    B
                  </span>
                  <h3 className="text-lg font-medium">Paste the Code</h3>
                </div>
                <div className="text-neutral-600 text-sm space-y-2">
                  <p>Paste the tracking code from Step 2 into the <strong>Order Confirmation Page</strong> box.</p>
                  <div className="bg-amber-50 border border-amber-200 p-3">
                    <p className="text-amber-800">
                      <strong>Important:</strong> Make sure to paste it in the Order Confirmation section,
                      not the Header or Footer sections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    C
                  </span>
                  <h3 className="text-lg font-medium">Save</h3>
                </div>
                <p className="text-neutral-600 text-sm">
                  Click <strong>Save</strong>. The tracking is now active!
                </p>
              </div>
            </div>
          </div>

          {/* What Gets Tracked */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">What Data Is Tracked</h2>
            <div className="bg-neutral-50 p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-600">
                  <tr className="border-b border-neutral-100">
                    <td className="py-2">Order ID</td>
                    <td className="py-2">Prevent duplicate tracking</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="py-2">Order Total</td>
                    <td className="py-2">Calculate commission</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="py-2">Product Names</td>
                    <td className="py-2">Match to VIA catalog</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="py-2">VIA Click ID</td>
                    <td className="py-2">Attribute sale to VIA referral</td>
                  </tr>
                  <tr>
                    <td className="py-2">Store Slug</td>
                    <td className="py-2">Identify your store</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-neutral-500 text-xs mt-3">
              We do not collect: customer names, emails, addresses, payment info, or any personal data.
            </p>
          </div>

          {/* Testing */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">Testing Your Setup</h2>
            <p className="text-neutral-600 text-sm mb-4">
              To verify the tracking is working:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-600">
              <li>
                Visit your store with a test click ID:{" "}
                <code className="bg-neutral-100 px-1">yourstore.com?via_click_id=test123</code>
              </li>
              <li>Complete a test purchase</li>
              <li>Check the VIA Analytics dashboard for the conversion</li>
            </ol>
          </div>

          {/* FAQ */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Common Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Will this slow down my checkout?</h3>
                <p className="text-neutral-600 text-sm">
                  No. The tracking code runs after the order is complete and doesn&apos;t affect
                  checkout speed. It&apos;s less than 1KB of code.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">What if a customer doesn&apos;t come from VIA?</h3>
                <p className="text-neutral-600 text-sm">
                  The pixel only sends data when a VIA click ID is present. Regular customers
                  without VIA referrals are not tracked.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">How long is the attribution window?</h3>
                <p className="text-neutral-600 text-sm">
                  30 days. If a customer clicks from VIA and purchases within 30 days, it&apos;s
                  attributed to VIA.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Do I need a Squarespace Business plan?</h3>
                <p className="text-neutral-600 text-sm">
                  Yes. Code Injection requires a Business plan or higher on Squarespace.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="border-t border-neutral-200 pt-8">
            <p className="text-neutral-600 text-sm">
              Need help? Email us at{" "}
              <a href="mailto:stores@viaplatform.com" className="text-black underline">
                stores@viaplatform.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
