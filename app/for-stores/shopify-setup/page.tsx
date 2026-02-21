import Link from "next/link";

export default function ShopifySetupPage() {
  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Link
              href="/for-stores"
              className="text-neutral-400 hover:text-black transition-colors"
            >
              &larr; Partner with VIA
            </Link>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Shopify Store Setup
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Connect your Shopify store to VIA using Shopify Collabs for automatic affiliate tracking.
          </p>
        </div>
      </section>

      {/* Time Estimate */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm">
            <span className="font-medium">⏱ Setup time:</span>{" "}
            <span className="text-neutral-600">~3 minutes</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* What is Shopify Collabs */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">What is Shopify Collabs?</h2>
            <p className="text-neutral-600 mb-4">
              Shopify Collabs is Shopify&apos;s built-in affiliate and creator management tool.
              It handles all affiliate tracking, commission calculation, and payouts automatically—no
              custom code or pixels required.
            </p>
            <div className="bg-green-50 border border-green-200 p-4 text-sm">
              <p className="text-green-800">
                <strong>Why we use Collabs:</strong> It&apos;s free, native to Shopify, and handles
                all the complex tracking automatically. The only setup on your end is enabling
                the Collabs app embed in your theme (a one-click toggle).
              </p>
            </div>
          </div>

          {/* Step by Step */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Setup Steps</h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <h3 className="text-lg font-medium">Install Shopify Collabs</h3>
                </div>
                <div className="text-neutral-600 space-y-3">
                  <p>If you haven&apos;t already, install the Shopify Collabs app:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your Shopify Admin</li>
                    <li>Navigate to <strong>Apps → Search</strong></li>
                    <li>Search for &quot;Shopify Collabs&quot;</li>
                    <li>Click <strong>Install</strong></li>
                  </ol>
                  <a
                    href="https://apps.shopify.com/collabs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-black underline hover:no-underline"
                  >
                    Open Shopify Collabs App Store page
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <h3 className="text-lg font-medium">Add VIA as a Collaborator</h3>
                </div>
                <div className="text-neutral-600 space-y-3">
                  <p>Invite VIA to your Collabs program:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open <strong>Shopify Collabs</strong> from your Apps</li>
                    <li>Go to <strong>Recruiting → Invite Creator</strong></li>
                    <li>Enter VIA&apos;s email:</li>
                  </ol>
                  <div className="bg-neutral-100 p-3 font-mono text-sm select-all">
                    partnerships@theviaplatform.com
                  </div>
                  <p className="text-sm">Attach your program offer to the invite and click <strong>Send Invite</strong>. We&apos;ll accept within 24 hours.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <h3 className="text-lg font-medium">Create a Custom Affiliate Link for VIA</h3>
                </div>
                <div className="text-neutral-600 space-y-3">
                  <p>
                    Once VIA has been added to your Collabs program, you need to create a
                    custom affiliate link that we&apos;ll use to send customers to your store.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>In Shopify Collabs, go to <strong>Affiliates</strong> and find VIA</li>
                    <li>Click on VIA&apos;s profile and go to <strong>Affiliate links</strong></li>
                    <li>Create a new custom link with a handle like <strong>VIAPARTNER</strong></li>
                  </ol>
                  <p className="text-sm">
                    This creates a link like:
                  </p>
                  <div className="bg-neutral-100 p-3 font-mono text-sm">
                    https://yourstore.com/VIAPARTNER
                  </div>
                  <p className="text-sm">
                    When a customer clicks a product on VIA, they&apos;ll be routed through this
                    link so Shopify knows the sale came from us.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 p-3 text-sm">
                    <p className="text-amber-800">
                      <strong>Important:</strong> Once you&apos;ve created the link, send it to us
                      at <a href="mailto:partnerships@theviaplatform.com" className="underline">partnerships@theviaplatform.com</a> so
                      we can connect it to your store on VIA.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <h3 className="text-lg font-medium">Set Tiered Commission Rates</h3>
                </div>
                <div className="text-neutral-600 space-y-4">
                  <p>
                    Shopify Collabs sets commission rates <strong className="text-black">per product collection</strong>,
                    not per order total. To set up tiers, you&apos;ll create three collections in your
                    Shopify store — one for each tier — assign your products to them by price, and
                    then set a different commission rate for each collection in Collabs.
                  </p>

                  {/* Part A */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-black">Part A — Create three collections in Shopify</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>In your Shopify Admin, go to <strong>Products → Collections</strong></li>
                      <li>Click <strong>Create collection</strong> and name it <strong>TIER 1</strong></li>
                      <li>Add all products priced <strong>under $1,000</strong> to this collection</li>
                      <li>Repeat to create <strong>TIER 2</strong> (products $1,000–$5,000) and <strong>TIER 3</strong> (products above $5,000)</li>
                    </ol>
                  </div>

                  {/* Part B */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-black">Part B — Set commission rates per collection in Collabs</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>In Shopify Collabs, click <strong>Programs</strong> in the left sidebar</li>
                      <li>Click <strong>Create program</strong> (or open your existing one)</li>
                      <li>Under <strong>Commission</strong>, click <strong>Add rate</strong> and select <strong>TIER 1</strong> → enter <strong>7%</strong></li>
                      <li>Click <strong>Add rate</strong> again, select <strong>TIER 2</strong> → enter <strong>5%</strong></li>
                      <li>Click <strong>Add rate</strong> again, select <strong>TIER 3</strong> → enter <strong>3%</strong></li>
                      <li>Under <strong>Cookie duration</strong>, enter <strong>30</strong> days</li>
                      <li>Click <strong>Save</strong></li>
                    </ol>
                  </div>

                  {/* Tier reference */}
                  <div className="bg-neutral-50 border border-neutral-200 p-4">
                    <p className="text-sm font-medium text-black mb-3">Commission rate reference:</p>
                    <div className="space-y-0">
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm"><strong>TIER 1</strong> — products under $1,000</span>
                        <span className="text-sm font-medium bg-black text-white px-3 py-1">7%</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-neutral-200">
                        <span className="text-sm"><strong>TIER 2</strong> — products $1,000–$5,000</span>
                        <span className="text-sm font-medium bg-neutral-500 text-white px-3 py-1">5%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm"><strong>TIER 3</strong> — products above $5,000</span>
                        <span className="text-sm font-medium bg-neutral-400 text-white px-3 py-1">3%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 text-sm">
                    <p className="text-amber-800">
                      <strong>Why 30 days?</strong> This captures customers who browse VIA but
                      come back to buy later. Most vintage purchases happen within a week, but
                      the extra window means you won&apos;t miss delayed sales.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="border-l-2 border-black pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-medium">
                    5
                  </span>
                  <h3 className="text-lg font-medium">Enable the Collabs App Embed</h3>
                </div>
                <div className="text-neutral-600 space-y-3">
                  <p>
                    This is a critical step. The Shopify Collabs app embed must be turned on in your
                    theme for affiliate tracking cookies to work. Without it, clicks from VIA
                    won&apos;t be attributed and commissions won&apos;t be tracked.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your Shopify Admin</li>
                    <li>Navigate to <strong>Online Store → Themes</strong></li>
                    <li>Click <strong>Customize</strong> on your active theme</li>
                    <li>In the theme editor, click <strong>App embeds</strong> (the blocks icon in the left sidebar)</li>
                    <li>Find <strong>Shopify Collabs</strong> and toggle it <strong>on</strong></li>
                    <li>Click <strong>Save</strong></li>
                  </ol>
                  <div className="bg-red-50 border border-red-200 p-3 text-sm">
                    <p className="text-red-800">
                      <strong>Why this matters:</strong> When a customer clicks through from VIA, the
                      app embed sets a tracking cookie on your store. That cookie is what captures
                      sales even if the customer leaves and comes back later — without it, we can only
                      track purchases made in that exact same session, which means most referred sales
                      won&apos;t be attributed and commissions won&apos;t be recorded.
                    </p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200 p-4 text-sm space-y-2">
                    <p className="font-medium text-black">Don&apos;t see Shopify Collabs in the list?</p>
                    <p className="text-neutral-600">First try scrolling down — it may be below your other apps. If it&apos;s still not there, contact Shopify Support at <strong>help.shopify.com</strong> → Contact Support and paste this message:</p>
                    <div className="bg-white border border-neutral-200 p-3 text-neutral-600 italic">
                      &quot;Hi, I have the Shopify Collabs app installed but it&apos;s not appearing in my App Embeds list in the theme editor. I need it to show up so I can toggle it on and enable affiliate tracking. Can you help me get it to register as an app embed?&quot;
                    </div>
                    <p className="text-neutral-500">Shopify Support can fix this quickly on their end.</p>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="border-l-2 border-neutral-300 pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-neutral-200 text-neutral-600 flex items-center justify-center text-sm font-medium">
                    6
                  </span>
                  <h3 className="text-lg font-medium text-neutral-600">Done!</h3>
                </div>
                <div className="text-neutral-500 space-y-3">
                  <p>
                    Once we accept your invitation and the app embed is enabled, all VIA traffic
                    to your store will be automatically tracked. Shopify handles:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Click tracking via affiliate links</li>
                    <li>Conversion attribution</li>
                    <li>Commission calculation</li>
                    <li>Monthly payouts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">How Attribution Works</h2>
            <div className="bg-neutral-50 p-6 space-y-4 text-sm">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs flex-shrink-0">1</div>
                <p>Customer clicks a product on VIA → redirected to your Shopify store with affiliate tracking</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs flex-shrink-0">2</div>
                <p>Shopify Collabs drops a cookie on the customer&apos;s browser</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs flex-shrink-0">3</div>
                <p>If they purchase within your cookie window, VIA gets credit</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs flex-shrink-0">4</div>
                <p>Commission is calculated and paid out monthly via Shopify</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Common Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Do I need to add any code to my store?</h3>
                <p className="text-neutral-600 text-sm">
                  No custom code is needed. The only requirement is enabling the Shopify Collabs
                  app embed in your theme (Step 5 above). This is a one-click toggle—no coding required.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">How do I see VIA-referred sales?</h3>
                <p className="text-neutral-600 text-sm">
                  In Shopify Collabs, go to <strong>Analytics</strong> to see all sales, clicks,
                  and commissions attributed to VIA.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">When do payouts happen?</h3>
                <p className="text-neutral-600 text-sm">
                  Shopify processes affiliate payouts monthly. You can configure payout thresholds
                  and methods in Collabs settings.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Can I change the commission rate later?</h3>
                <p className="text-neutral-600 text-sm">
                  Yes. You can adjust commission rates anytime in Collabs settings. Changes apply
                  to future sales only.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="border-t border-neutral-200 pt-8">
            <p className="text-neutral-600 text-sm">
              Need help? Email us at{" "}
              <a href="mailto:partnerships@theviaplatform.com" className="text-black underline">
                partnerships@theviaplatform.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
