import FAQAccordion from "@/app/components/FAQAccordion";

export default function FAQsPage() {
  const faqs = [
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
  ];

  return (
    <main className="bg-[#f7f6f3] py-32">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-6xl font-serif mb-6">FAQs</h1>

        <p className="text-gray-700 mb-16 max-w-2xl">
          Answers to common questions about shopping, shipping, and partnering with VIA.
        </p>

        <FAQAccordion faqs={faqs} />
      </div>
    </main>
  );
}
