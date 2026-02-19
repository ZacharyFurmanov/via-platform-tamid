"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Section = {
  title: string;
  content: React.ReactNode;
};

export default function ProductAccordion({ sections }: { sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="border-t border-neutral-200">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border-b border-neutral-200">
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between py-4 text-left"
            >
              <span className="text-sm uppercase tracking-[0.1em] font-medium text-black">
                {section.title}
              </span>
              <ChevronDown
                size={16}
                className={`text-black/40 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isOpen ? "max-h-[600px] opacity-100 pb-5" : "max-h-0 opacity-0"
              }`}
            >
              <div className="text-sm text-black/70 leading-relaxed">
                {section.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
