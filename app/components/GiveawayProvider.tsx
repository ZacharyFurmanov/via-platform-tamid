"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import GiveawayModal from "./giveaway/GiveawayModal";

interface GiveawayContextType {
  openModal: () => void;
}

const GiveawayContext = createContext<GiveawayContextType | null>(null);

export function useGiveaway() {
  const context = useContext(GiveawayContext);
  if (!context) {
    throw new Error("useGiveaway must be used within GiveawayProvider");
  }
  return context;
}

function GiveawayProviderInner({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const hasAutoShownRef = useRef(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
  };

  // Auto-show logic
  useEffect(() => {
    // If URL has ?ref=, show giveaway modal immediately (works on /waitlist)
    const ref = searchParams.get("ref");
    if (ref && pathname === "/waitlist") {
      setRefCode(ref);
      if (!hasAutoShownRef.current) {
        hasAutoShownRef.current = true;
        setIsOpen(true);
      }
      return;
    }

    // Only auto-show on homepage
    if (pathname !== "/") return;

    // If already entered, don't auto-show
    const alreadyEntered = localStorage.getItem("via_giveaway_entered");
    if (alreadyEntered) return;

    // Otherwise show after 2s delay
    if (hasAutoShownRef.current) return;

    const timer = setTimeout(() => {
      hasAutoShownRef.current = true;
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <GiveawayContext.Provider value={{ openModal }}>
      {children}
      <GiveawayModal isOpen={isOpen} onClose={closeModal} refCode={refCode} />
    </GiveawayContext.Provider>
  );
}

export function GiveawayProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GiveawayProviderInner>{children}</GiveawayProviderInner>
    </Suspense>
  );
}

// Footer link component
export function GiveawayFooterLink() {
  const { openModal } = useGiveaway();

  return (
    <button
      onClick={openModal}
      className="text-neutral-300 hover:text-white transition-colors duration-200 text-sm text-left"
    >
      Enter the Giveaway
    </button>
  );
}
