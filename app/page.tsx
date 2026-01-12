export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-bold mb-6">VIA</h1>
        <p className="text-gray-500 max-w-xl mb-10">
          Shop curated vintage & resale from the best stores — all in one place.
        </p>

        <a
          href="https://viaplatform.carrd.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-white text-black px-8 py-4 font-medium hover:bg-gray-200 transition"
        >
          Join the waitlist
        </a>
      </section>

      {/* HOW VIA WORKS */}
      <section className="mt-32">
        <h2 className="text-3xl font-semibold mb-12 text-center">
          How VIA Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-4xl mb-4">🏬</div>
            <h3 className="text-xl font-medium mb-4">
              Partner with trusted stores
            </h3>
            <p className="text-gray-500">
              Independent vintage and resale shops apply and are vetted before
              joining VIA.
            </p>
          </div>

          <div>
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-medium mb-4">
              Stores list their inventory
            </h3>
            <p className="text-gray-500">
              VIA handles discovery while stores keep control of pricing and
              brand.
            </p>
          </div>

          <div>
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-xl font-medium mb-4">
              Shoppers browse across stores
            </h3>
            <p className="text-gray-500">
              Customers search across stores and buy directly — all in one place.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}



