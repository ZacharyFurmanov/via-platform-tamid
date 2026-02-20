"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import SignUpModal from "./SignUpModal";

interface SignUpContextType {
  openModal: (targetUrl?: string) => void;
}

const SignUpContext = createContext<SignUpContextType | null>(null);

export function useSignUp() {
  const context = useContext(SignUpContext);
  if (!context) {
    throw new Error("useSignUp must be used within SignUpProvider");
  }
  return context;
}

export function SignUpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string | undefined>();

  const openModal = (url?: string) => {
    setTargetUrl(url);
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  return (
    <SignUpContext.Provider value={{ openModal }}>
      {children}
      <SignUpModal isOpen={isOpen} onClose={closeModal} callbackUrl={targetUrl} />
    </SignUpContext.Provider>
  );
}
