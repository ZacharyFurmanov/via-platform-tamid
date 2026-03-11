"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
  required?: boolean;
}

export default function SignUpModal({ isOpen, onClose, callbackUrl, required = false }: SignUpModalProps) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectUrl = callbackUrl || "/";

  // Animate modal entrance
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setShowModal(true));
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // Escape key handler (disabled when required)
  useEffect(() => {
    if (required) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose, required]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("resend", { email, callbackUrl: redirectUrl });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ease-out ${
          showModal ? "opacity-100" : "opacity-0"
        }`}
        onClick={required ? undefined : handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm mx-4 bg-[#F7F3EA] shadow-2xl transition-all duration-300 ease-out ${
          showModal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Close button (hidden when required) */}
        {!required && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="p-8 sm:p-10">
          <h2 className="font-serif text-3xl sm:text-4xl text-center mb-3">
            Sign in to VYA
          </h2>
          <p className="text-sm text-[#5D0F17]/50 text-center mb-10">
            Create an account to start shopping.
          </p>

          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl: redirectUrl })}
            className="w-full flex items-center justify-center gap-3 bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition mb-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
            <span className="text-xs text-[#5D0F17]/40 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>

          {/* Email magic link */}
          <form onSubmit={handleEmailSignIn}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full border border-[#5D0F17]/20 px-4 py-3.5 text-sm outline-none focus:border-[#5D0F17] bg-transparent transition mb-3"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </form>

          <p className="text-[11px] text-[#5D0F17]/40 text-center mt-8 leading-relaxed">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>, and
            to receive email updates from VYA. You can unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
