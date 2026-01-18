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
              className="w-full flex items-center justify-between text-left group"
            >
              <h3 className="text-xl font-serif transition-opacity group-hover:opacity-70">
                {faq.q}
              </h3>

              <span
  className={`text-2xl leading-none transition-transform duration-300 ${
    isOpen ? "rotate-45" : "rotate-0"
  }`}
>
  +
</span>
            </button>

            {/* Animated answer */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100 mt-4"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p
                  className={`text-gray-700 max-w-3xl transition-all duration-300 ease-in-out ${
                    isOpen ? "translate-y-0" : "-translate-y-2"
                  }`}
                >
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

