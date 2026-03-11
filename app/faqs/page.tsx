import FAQAccordion from "@/app/components/FAQAccordion";

export default function FAQsPage() {
  const faqs = [
    {
      q: "What is VYA?",
      a: "VYA is a platform that brings together independent vintage and secondhand stores, allowing you to browse across shops in one place while checking out directly with the store you choose.",
    },
    {
      q: "How does shopping on VYA work?",
      a: "You can browse items and stores on VYA, then when you're ready to purchase, you'll be redirected to the store's own website to complete checkout.",
    },
    {
      q: "Do I buy items directly from VYA?",
      a: "No. VYA does not process payments or hold inventory. All purchases are completed directly with the individual store.",
    },
    {
      q: "Is everything on VYA authentic?",
      a: "Yes. We partner with vetted vintage and secondhand stores known for authenticity, quality, and expertise in their categories.",
    },
    {
      q: "Who handles shipping?",
      a: "Each store ships orders directly to you using their own shipping methods, rates, and timelines.",
    },
    {
      q: "What about returns or exchanges?",
      a: "Return and exchange policies are set by each individual store. You'll find the specific policy on the store's website where you complete your purchase.",
    },
    {
      q: "Where do stores on VYA ship?",
      a: "Stores decide where they ship, but most stores ship worldwide.",
    },
    {
      q: "How are stores selected for VYA?",
      a: "Stores on VYA are carefully selected based on curation quality, authenticity standards, and overall brand alignment.",
    },
    {
      q: "Does VYA take a commission?",
      a: "VYA may earn a commission when you purchase from a store through our platform. This helps support the continued curation and operation of VYA.",
    },
    {
      q: "Are prices on VYA different from store websites?",
      a: "No. Prices are set by each store and are the same as those listed on their own website.",
    },
    {
      q: "Can stores remove themselves from VYA?",
      a: "Yes. Stores partner with VYA voluntarily and can choose to update or remove their presence at any time.",
    },
    {
      q: "I'm a store owner, how can I partner with VYA?",
      a: "You can visit our Partner With VYA page to learn more and get in touch about joining the platform.",
    },
  ];

  return (
    <main className="bg-[#F7F3EA] min-h-screen py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-1">
          <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">Have questions?</p>
          <div className="flex-1 h-px bg-[#5D0F17]/15" />
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-8">
          FAQs
        </h1>

        <p className="text-[#5D0F17]/60 mb-16 max-w-2xl">
          Answers to common questions about shopping, shipping, and partnering with VYA.
        </p>

        <FAQAccordion faqs={faqs} />

        {/* ================= STILL HAVE QUESTIONS ================= */}
        <div className="mt-24 border-t border-[#5D0F17]/10 pt-16 text-center">
          <h3 className="text-3xl font-serif mb-4 text-[#5D0F17]">
            Still have questions?
          </h3>

          <p className="text-[#5D0F17]/60 max-w-xl mx-auto mb-8">
            If you&apos;re a shopper or a store and need more information, we&apos;re happy to help.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hana@theviaplatform.com"
              className="bg-[#5D0F17] text-[#F7F3EA] px-8 py-4 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
            >
              Contact Us
            </a>

            <a
              href="/for-stores"
              className="border border-[#5D0F17] text-[#5D0F17] px-8 py-4 text-sm uppercase tracking-wide hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
            >
              Partner With VYA
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
