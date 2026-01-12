export default function ForStoresPage() {
  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-6">For Stores</h1>

      <p className="text-gray-400 max-w-xl mb-10">
        VIA helps independent vintage & resale stores reach customers nationwide
        — without changing how you run your business.
      </p>

      <ul className="text-gray-300 mb-10 space-y-3">
        <li>• Sell your existing inventory online</li>
        <li>• Keep your brand, pricing, and voice</li>
        <li>• Get discovered by shoppers across stores</li>
        <li>• No SEO, ads, or marketing required</li>
      </ul>

      <a
        href="https://forms.gle/rNWypufodudZe46MA"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-white text-black px-8 py-4 font-medium hover:bg-gray-200 transition"
      >
        Partner with VIA
      </a>

      {/* HOW VIA WORKS (FOR STORES) */}
      <div className="mt-32 max-w-4xl">
        <h2 className="text-3xl font-semibold mb-12">
          How VIA Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-xl font-medium mb-3">1. Apply</h3>
            <p className="text-gray-400">
              Stores apply to join VIA and are vetted to ensure quality and fit.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-3">2. Sync inventory</h3>
            <p className="text-gray-400">
            VIA connects to your existing website or storefront — no re-listing,
            no migration, no change to how you sell.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-3">3. Get discovered</h3>
            <p className="text-gray-400">
            Shoppers discover your inventory through VIA’s cross-store search,
            while you keep full control of brand, pricing, and fulfillment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
