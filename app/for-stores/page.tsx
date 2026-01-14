export default function ForStoresPage() {
  return (
    <main className="flex flex-col items-center text-center">

      {/* FOR STORES */}
      <section className="min-h-screen w-full flex flex-col items-center pt-32 pb-32">
        <h1 className="text-4xl font-bold mb-6">For Stores</h1>

        <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-xl mb-12">
          VIA helps independent vintage & resale stores reach customers nationwide
          — without changing how you run your business.
        </p>

        <ul className="text-base md:text-lg text-gray-300 mb-14 space-y-4">
          <li>Sell your existing inventory online</li>
          <li>Keep your brand, pricing, and voice</li>
          <li>Get discovered by shoppers across stores</li>
          <li>No SEO, ads, or marketing required</li>
        </ul>
      </section>

      {/* HOW VIA WORKS */}
      <section className="min-h-screen w-full flex flex-col items-center pt-24 pb-32">
        <h2 className="text-4xl font-semibold mb-16">
          How VIA Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-5xl px-6">
          <div>
            <h3 className="text-2xl font-medium mb-4">1. Apply</h3>
            <p className="text-gray-300">
              Stores apply to join VIA and are vetted to ensure quality and fit.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-medium mb-4">2. Sync inventory</h3>
            <p className="text-gray-300">
              VIA connects to your existing site — no re-listing, no migration.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-medium mb-4">3. Get discovered</h3>
            <p className="text-gray-300">
              Shoppers find you via cross-store search while you keep full control.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
