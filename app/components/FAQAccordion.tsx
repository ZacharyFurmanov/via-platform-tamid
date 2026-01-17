"use client";

import { useState } from "react";

type FAQ = {
  q: string;
  a: string;
};

export default function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={faq.q}
            className="border-b border-black/20 pb-6"
          >
            <button
              onClick={() =>
                setOpenIndex(isOpen ? null : index)
              }
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xl font-serif">
                {faq.q}
              </h3>

              <span className="text-2xl leading-none">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && (
              <p className="mt-4 text-gray-700 max-w-3xl">
                {faq.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
