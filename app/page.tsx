import Link from "next/link";
import FAQAccordion from "./components/FAQAccordion";

export default function HomePage() {
  return (
    <main className="w-full">

      {/* ================= HERO ================= */}
      <section className="min-h-screen bg-black flex items-center">
        <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-6 uppercase">
  SHOP CURATED & VINTAGE RESALE
</p>

<h1 className="text-6xl md:text-7xl font-serif mb-8 text-white">
  VIA
</h1>

<p className="max-w-lg mb-10 text-lg text-gray-200">
  Shop independent resale and vintage stores from across the country —
  all in one place.
</p>

<div className="flex gap-6">
<Link
  href="/stores"
  className="bg-white px-10 py-4 text-sm uppercase tracking-wide hover:bg-neutral-200 transition"
>
  <span className="text-black">
    Explore Stores
  </span>
</Link>

  <Link
    href="/categories"
    className="border border-white text-white px-10 py-4 text-sm uppercase tracking-wide hover:bg-white hover:!text-black transition"
  >
    Browse Categories
  </Link>
</div>

        </div>
      </section>

      {/* ================= HIGHLIGHTED STORES ================= */}
      <section className="bg-neutral-100 py-32 text-black opacity-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div>
            <h2 className="text-5xl font-serif mb-4 text-black">
            Our highlighted stores
            </h2>

              <p className="text-black">
                A closer look at a selection of stores we’re excited about.
              </p>
            </div>

            <Link
              href="/stores"
              className="border border-black px-6 py-3 text-sm uppercase"
            >
              Explore all stores
            </Link>
          </div>

          {/* Placeholder grid for now */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {["LEI", "Sourced by Scottie", "RE Park City"].map((store) => (
              <Link
                key={store}
                href={`/stores/${store.toLowerCase().replace(/\s/g, "-")}`}
                className="block group"
              >
                <div className="aspect-[4/5] bg-gray-300 mb-4" />
                <h3 className="text-xl font-serif text-black"> {store} </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SHOP BY CATEGORY ================= */}
      <section className="bg-[#f1f1ee] py-32">
        <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-6xl font-serif text-black mb-6">
            Shop by Category
        </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              "Clothes",
              "Bags",
              "Shoes",
              "Accessories",
            ].map((category) => (
              <Link
                key={category}
                href={`/categories/${category.toLowerCase()}`}
                className="group relative"
              >
                <div className="aspect-[3/4] bg-gray-300 flex items-end p-6">
                  <h3 className="text-2xl font-serif text-black">

                    {category}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

   {/* ================= FAQ TEASER ================= */}
<section className="bg-[#f7f6f3] py-32">
  <div className="max-w-6xl mx-auto px-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-20">
      <div className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">
          Have questions?
        </p>

        <h2 className="text-5xl font-serif mb-6">
          Frequently Asked Questions
        </h2>

        <p className="text-gray-700">
          Everything you need to know about shopping, shipping, and partnering
          with VIA.
        </p>
      </div>

      <div className="mt-8 md:mt-2">
        <Link
          href="/faqs"
          className="inline-block border border-black px-6 py-3 text-sm uppercase tracking-wide hover:bg-black hover:text-white transition"
        >
          Explore FAQs
        </Link>
      </div>
    </div>

    <FAQAccordion
      faqs={[
        {
          q: "Is everything authentic?",
          a: "Yes — we partner only with vetted stores known for authenticity and quality.",
        },
        {
          q: "Who handles shipping?",
          a: "Each store fulfills orders directly using their own shipping policies.",
        },
        {
          q: "What about returns?",
          a: "Return policies are set by each individual store and listed on their product pages.",
        },
        {
          q: "Where do you ship?",
          a: "Stores on VIA ship nationwide, and some offer international shipping.",
        },
      ]}
    />
  </div>
</section>

      {/* ================= VIA EXPERIENCE ================= */}
      <section className="bg-[#f7f6f3] py-32 text-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-serif mb-6">
            The VIA Experience
          </h2>
          <p className="text-black max-w-2xl mx-auto mb-20">
            A refined online experience designed for ease, trust, and global reach.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-serif mb-3">Browse local stores</h3>
              <p className="text-black">
                Discover curated resale from independent stores nationwide.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-serif mb-3">Search by items</h3>
              <p className="text-black">
                Find exactly what you’re looking for across multiple stores.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-serif mb-3">Find hidden gems</h3>
              <p className="text-black">
                Uncover rare, one-of-a-kind pieces curated with intention.
              </p>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

