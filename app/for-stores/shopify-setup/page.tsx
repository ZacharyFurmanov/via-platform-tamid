import Link from "next/link";

export default function ShopifySetupPage() {
  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* Header */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <Link
              href="/for-stores"
              className="text-[#5D0F17]/40 hover:text-[#5D0F17] transition-colors"
            >
              &larr; Partner with VYA
            </Link>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Shopify Store Setup
          </h1>
          <p className="text-[#5D0F17]/60 text-base sm:text-lg">
            Connect your Shopify store to VYA using Shopify Collabs for automatic affiliate tracking.
          </p>
        </div>
      </section>

      {/* Time Estimate */}
      <section className="border-b border-[#5D0F17]/10 bg-[#5D0F17]/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm">
            <span className="font-medium">⏱ Setup time:</span>{" "}
            <span className="text-[#5D0F17]/60">~3 minutes</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* What is Shopify Collabs */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-4">What is Shopify Collabs?</h2>
            <p className="text-[#5D0F17]/60 mb-4">
              Shopify Collabs is Shopify&apos;s built-in affiliate and creator management tool.
              It handles all affiliate tracking, commission calculation, and payouts automatically—no
              custom code or pixels required.
            </p>
            <div className="bg-green-50 border border-green-200 p-4 text-sm">
              <p className="text-green-800">
                <strong>Why we use Collabs:</strong> It&apos;s free, native to Shopify, and handles
                all the complex tracking automatically. We generate per-product affiliate links
                on our end, so there&apos;s no theme setup required on yours.
              </p>
            </div>
          </div>

          {/* Step by Step */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Setup Steps</h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="border-l-2 border-[#5D0F17] pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <h3 className="text-lg font-medium">Install Shopify Collabs</h3>
                </div>
                <div className="text-[#5D0F17]/60 space-y-3">
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
                    className="inline-flex items-center gap-2 text-sm text-[#5D0F17] underline hover:no-underline"
                  >
                    Open Shopify Collabs App Store page
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-2 border-[#5D0F17] pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <h3 className="text-lg font-medium">Add VYA as a Collaborator</h3>
                </div>
                <div className="text-[#5D0F17]/60 space-y-3">
                  <p>Invite VYA to your Collabs program:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open <strong>Shopify Collabs</strong> from your Apps</li>
                    <li>Go to <strong>Recruiting → Invite Creator</strong></li>
                    <li>Enter VYA&apos;s email:</li>
                  </ol>
                  <div className="bg-[#5D0F17]/10 p-3 font-mono text-sm select-all">
                    partnerships@vyaplatform.com
                  </div>
                  <p className="text-sm">Attach your program offer to the invite and click <strong>Send Invite</strong>. We&apos;ll accept within 24 hours.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-2 border-[#5D0F17] pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <h3 className="text-lg font-medium">We Generate the Affiliate Links</h3>
                </div>
                <div className="text-[#5D0F17]/60 space-y-3">
                  <p>
                    Once VYA has been added to your Collabs program, we generate a unique
                    affiliate link for each of your products on our end. No action needed from you.
                  </p>
                  <p className="text-sm">
                    Each product gets its own tracked link like:
                  </p>
                  <div className="bg-[#5D0F17]/10 p-3 font-mono text-sm">
                    https://collabs.shop/xxxxxxx
                  </div>
                  <p className="text-sm">
                    When a customer clicks a product on VYA, they&apos;re routed through that
                    product&apos;s link. Shopify Collabs registers the visit and sets a tracking
                    cookie automatically — no theme changes or app embeds needed on your store.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="border-l-2 border-[#5D0F17] pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <h3 className="text-lg font-medium">Set Tiered Commission Rates</h3>
                </div>
                <div className="text-[#5D0F17]/60 space-y-4">
                  <p>
                    Shopify Collabs sets commission rates <strong className="text-[#5D0F17]">per product collection</strong>,
                    not per order total. To set up tiers, you&apos;ll create three collections in your
                    Shopify store — one for each tier — assign your products to them by price, and
                    then set a different commission rate for each collection in Collabs.
                  </p>

                  {/* Part A */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#5D0F17]">Part A — Create three collections in Shopify</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>In your Shopify Admin, go to <strong>Products → Collections</strong></li>
                      <li>Click <strong>Create collection</strong> and name it <strong>TIER 1</strong></li>
                      <li>Add all products priced <strong>under $1,000</strong> to this collection</li>
                      <li>Repeat to create <strong>TIER 2</strong> (products $1,000–$5,000) and <strong>TIER 3</strong> (products above $5,000)</li>
                    </ol>
                  </div>

                  {/* Part B */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#5D0F17]">Part B — Set commission rates per collection in Collabs</p>
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
                  <div className="bg-[#5D0F17]/5 border border-[#5D0F17]/10 p-4">
                    <p className="text-sm font-medium text-[#5D0F17] mb-3">Commission rate reference:</p>
                    <div className="space-y-0">
                      <div className="flex justify-between items-center py-2 border-b border-[#5D0F17]/10">
                        <span className="text-sm"><strong>TIER 1</strong> — products under $1,000</span>
                        <span className="text-sm font-medium bg-[#5D0F17] text-[#F7F3EA] px-3 py-1">7%</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#5D0F17]/10">
                        <span className="text-sm"><strong>TIER 2</strong> — products $1,000–$5,000</span>
                        <span className="text-sm font-medium bg-[#5D0F17]/50 text-white px-3 py-1">5%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm"><strong>TIER 3</strong> — products above $5,000</span>
                        <span className="text-sm font-medium bg-[#5D0F17]/40 text-[#F7F3EA] px-3 py-1">3%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 text-sm">
                    <p className="text-amber-800">
                      <strong>Why 30 days?</strong> This captures customers who browse VYA but
                      come back to buy later. Most vintage purchases happen within a week, but
                      the extra window means you won&apos;t miss delayed sales.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="border-l-2 border-[#5D0F17]/20 pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-[#5D0F17]/15 text-[#5D0F17]/60 flex items-center justify-center text-sm font-medium">
                    5
                  </span>
                  <h3 className="text-lg font-medium text-[#5D0F17]/60">Done!</h3>
                </div>
                <div className="text-[#5D0F17]/50 space-y-3">
                  <p>
                    Once we accept your invitation, all VYA traffic to your store will be
                    automatically tracked. No theme changes needed — our per-product links
                    handle tracking and attribution. Shopify handles:
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
            <div className="bg-[#5D0F17]/5 p-6 space-y-4 text-sm">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-xs flex-shrink-0">1</div>
                <p>Customer clicks a product on VYA → routed through a unique per-product affiliate link</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-xs flex-shrink-0">2</div>
                <p>Shopify Collabs registers the visit and sets an attribution cookie</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-xs flex-shrink-0">3</div>
                <p>If they purchase within your cookie window, VYA gets credit</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-[#5D0F17] text-[#F7F3EA] flex items-center justify-center text-xs flex-shrink-0">4</div>
                <p>Commission is calculated and paid out monthly via Shopify</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-serif mb-6">Common Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Do I need to change anything on my store or theme?</h3>
                <p className="text-[#5D0F17]/60 text-sm">
                  No. We use per-product affiliate links that handle tracking automatically.
                  No theme changes, app embeds, or custom code required on your end.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">How do I see VYA-referred sales?</h3>
                <p className="text-[#5D0F17]/60 text-sm">
                  In Shopify Collabs, go to <strong>Analytics</strong> to see all sales, clicks,
                  and commissions attributed to VYA.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">When do payouts happen?</h3>
                <p className="text-[#5D0F17]/60 text-sm">
                  Shopify processes affiliate payouts monthly. You can configure payout thresholds
                  and methods in Collabs settings.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Can I change the commission rate later?</h3>
                <p className="text-[#5D0F17]/60 text-sm">
                  Yes. You can adjust commission rates anytime in Collabs settings. Changes apply
                  to future sales only.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="border-t border-[#5D0F17]/10 pt-8">
            <p className="text-[#5D0F17]/60 text-sm">
              Need help? Email us at{" "}
              <a href="mailto:partnerships@vyaplatform.com" className="text-[#5D0F17] underline">
                partnerships@vyaplatform.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
