import FAQAccordion from "@/app/components/FAQAccordion";

export default function FAQsPage() {
  const faqs = [
    {
      q: "What is VIA?",
      a: "VIA is a curated platform that brings together independent vintage and resale stores, allowing you to browse across shops in one place while checking out directly with the store you choose.",
    },
    {
      q: "How does shopping on VIA work?",
      a: "You can browse items and stores on VIA, then when you’re ready to purchase, you’ll be redirected to the store’s own website to complete checkout.",
    },
    {
      q: "Do I buy items directly from VIA?",
      a: "No. VIA does not process payments or hold inventory. All purchases are completed directly with the individual store.",
    },
    {
      q: "Is everything on VIA authentic?",
      a: "Yes. We partner with vetted vintage and resale stores known for authenticity, quality, and expertise in their categories.",
    },
    {
      q: "Who handles shipping?",
      a: "Each store ships orders directly to you using their own shipping methods, rates, and timelines.",
    },
    {
      q: "What about returns or exchanges?",
      a: "Return and exchange policies are set by each individual store. You’ll find the specific policy on the store’s website where you complete your purchase.",
    },
    {
      q: "Where do stores on VIA ship?",
      a: "Most stores ship worldwide, and some offer international shipping. Shipping availability and costs are determined by each store.",
    },
    {
      q: "How are stores selected for VIA?",
      a: "Stores on VIA are carefully selected based on curation quality, authenticity standards, and overall brand alignment.",
    },
    {
      q: "Does VIA take a commission?",
      a: "VIA may earn a commission when you purchase from a store through our platform. This helps support the continued curation and operation of VIA.",
    },
    {
      q: "Are prices on VIA different from store websites?",
      a: "No. Prices are set by each store and are the same as those listed on their own website.",
    },
    {
      q: "Can stores remove themselves from VIA?",
      a: "Yes. Stores partner with VIA voluntarily and can choose to update or remove their presence at any time.",
    },
    {
      q: "I’m a store owner, how can I partner with VIA?",
      a: "You can visit our Partner With VIA page to learn more and get in touch about joining the platform.",
    },
  ];

  return (
    <main className="bg-[#f7f6f3] py-32">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-6xl font-serif mb-6">FAQs</h1>

        <p className="text-gray-700 mb-16 max-w-2xl">
          Answers to common questions about shopping, shipping, and partnering with VIA.
        </p>

        <FAQAccordion faqs={faqs} />

        {/* ================= STILL HAVE QUESTIONS ================= */}
        <div className="mt-24 border-t border-gray-200 pt-16 text-center">
          <h3 className="text-3xl font-serif mb-4">
            Still have questions?
          </h3>

          <p className="text-gray-600 max-w-xl mx-auto mb-8">
            If you’re a shopper or a store and need more information, we’re happy to help.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hana@theviaplatform.com"
              className="bg-black text-white px-8 py-4 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
            >
              Contact Us
            </a>

            <a
              href="/for-stores"
              className="border border-black px-8 py-4 text-sm uppercase tracking-wide hover:bg-black hover:text-white transition"
            >
              Partner With VIA
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
