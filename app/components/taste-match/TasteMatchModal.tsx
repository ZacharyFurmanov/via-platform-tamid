"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuizQuestion from "./QuizQuestion";
import QuizProgress from "./QuizProgress";
import TasteCard from "./TasteCard";
import ShareButton from "./ShareButton";
import ReferralProgress from "./ReferralProgress";
import TasteComparison from "./TasteComparison";
import UnlockCelebration from "./UnlockCelebration";
import { QUIZ_QUESTIONS, generateUserId } from "@/app/lib/taste-scoring";
import type { QuizAnswers, TasteTag, TasteProfile, ReferralStatus } from "@/app/lib/taste-types";

interface TasteMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = "landing" | "quiz" | "results";

interface ProfileData {
  userId: string;
  primaryTag: TasteTag;
  primaryPercentage: number;
  secondaryTag: TasteTag;
  secondaryPercentage: number;
  tertiaryTag: TasteTag;
  tertiaryPercentage: number;
  scores?: Record<string, number>;
  answers?: Record<number, string>;
  createdAt?: Date;
}

export default function TasteMatchModal({ isOpen, onClose }: TasteMatchModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>("landing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [referrals, setReferrals] = useState<ReferralStatus | null>(null);
  const [isShareBlurred, setIsShareBlurred] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [quizTransition, setQuizTransition] = useState(false);

  // Animate modal entrance
  useEffect(() => {
    if (isOpen) {
      // Trigger entrance animation on next frame
      requestAnimationFrame(() => setShowModal(true));
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  // Initialize or retrieve user ID
  useEffect(() => {
    if (isOpen) {
      let storedUserId = localStorage.getItem("via_taste_user_id");

      // Check if user already has a profile
      if (storedUserId) {
        const storedProfile = localStorage.getItem(`via_taste_profile_${storedUserId}`);
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfile(parsed);
          setUserId(storedUserId);
          setStep("results");
          fetchReferralStatus(storedUserId);
          return;
        }
      }

      // Create new user ID if needed
      if (!storedUserId) {
        storedUserId = generateUserId();
        localStorage.setItem("via_taste_user_id", storedUserId);
      }
      setUserId(storedUserId);
    }
  }, [isOpen]);

  const fetchReferralStatus = async (uid: string) => {
    try {
      const res = await fetch(`/api/taste-match/referrals/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals);
      }
    } catch {
      // Referrals unavailable, continue without them
    }
  };

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    if (step !== "results") {
      setStep("landing");
      setCurrentIndex(0);
      setAnswers({});
    }
    setShowModal(false);
    // Wait for exit animation before unmounting
    setTimeout(() => onClose(), 200);
  }, [step, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
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

  const handleStartQuiz = async () => {
    if (userId) {
      try {
        await fetch("/api/taste-match/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch {
        // Continue even if user creation fails
      }
    }
    setStep("quiz");
  };

  const handleSelectAnswer = async (optionId: string) => {
    const currentQuestion = QUIZ_QUESTIONS[currentIndex];
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: optionId,
    };
    setAnswers(newAnswers);

    // Trigger transition animation
    setQuizTransition(true);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;
    if (isLastQuestion) {
      await handleSubmit(newAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
      // Reset transition for new question fade-in
      setTimeout(() => setQuizTransition(false), 50);
    }
  };

  const handleSubmit = async (finalAnswers: QuizAnswers) => {
    if (!userId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/taste-match/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          answers: finalAnswers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          localStorage.setItem(
            `via_taste_profile_${userId}`,
            JSON.stringify(data.profile)
          );
          setProfile(data.profile);
        }
        setStep("results");
        fetchReferralStatus(userId);
      } else {
        console.error("Failed to submit quiz");
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setQuizTransition(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setTimeout(() => setQuizTransition(false), 50);
      }, 150);
    }
  };

  const handleViewFullResults = () => {
    if (userId) {
      router.push(`/taste-match/${userId}`);
      handleClose();
    }
  };

  const handleRetakeQuiz = () => {
    if (userId) {
      localStorage.removeItem(`via_taste_profile_${userId}`);
      localStorage.removeItem(`via_taste_unlocked_${userId}`);
    }
    setProfile(null);
    setReferrals(null);
    setAnswers({});
    setCurrentIndex(0);
    setStep("landing");
  };

  if (!isOpen) return null;

  const isUnlocked = referrals?.isUnlocked || false;
  const completedCount = referrals?.completedCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-all duration-300 ease-out ${
          showModal ? "opacity-100" : "opacity-0"
        } ${isShareBlurred ? "backdrop-blur-md" : "backdrop-blur-sm"}`}
        onClick={handleClose}
      />

      {/* Modal with entrance animation */}
      <div
        className={`relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-[#f7f6f3] rounded-lg shadow-2xl transition-all duration-300 ease-out ${
          showModal
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-black transition"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Landing Step */}
        {step === "landing" && (
          <div
            className={`p-8 sm:p-12 text-center transition-all duration-300 ease-out ${
              showModal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">
              VIA Taste Match
            </p>

            <h2 className="text-3xl sm:text-4xl font-serif mb-4 text-black leading-tight">
              Discover Your
              <br />
              Fashion Taste
            </h2>

            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              Answer 5 quick questions to uncover your unique style profile.
            </p>

            <button
              onClick={handleStartQuiz}
              className="bg-black text-white px-8 py-4 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
            >
              Start Quiz
            </button>
          </div>
        )}

        {/* Quiz Step */}
        {step === "quiz" && !isSubmitting && (
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <QuizProgress
                current={currentIndex + 1}
                total={QUIZ_QUESTIONS.length}
              />
            </div>

            <div
              className={`transition-all duration-200 ease-out ${
                quizTransition
                  ? "opacity-0 translate-x-4"
                  : "opacity-100 translate-x-0"
              }`}
            >
              <QuizQuestion
                question={QUIZ_QUESTIONS[currentIndex]}
                selectedAnswer={answers[QUIZ_QUESTIONS[currentIndex].id] || null}
                onSelect={handleSelectAnswer}
              />
            </div>

            {currentIndex > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-black transition"
                >
                  ← Previous question
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {step === "quiz" && isSubmitting && (
          <div className="p-12 text-center">
            <div className="animate-pulse mb-4">
              <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
            <p className="text-gray-600">Calculating your taste...</p>
          </div>
        )}

        {/* Results Step */}
        {step === "results" && profile && (
          <div className="p-6 sm:p-8">
            {/* Results card with fade-in */}
            <div className="animate-[fadeSlideUp_0.4s_ease-out_both]">
              <div className="text-center mb-6">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">
                  Your Taste Profile
                </p>
              </div>

              <TasteCard
                primaryTag={profile.primaryTag}
                primaryPercentage={profile.primaryPercentage}
                secondaryTag={profile.secondaryTag}
                secondaryPercentage={profile.secondaryPercentage}
                tertiaryTag={profile.tertiaryTag}
                tertiaryPercentage={profile.tertiaryPercentage}
              />
            </div>

            {/* Share + Referral Section */}
            <div className="mt-6 animate-[fadeSlideUp_0.4s_ease-out_0.15s_both]">
              {userId && (
                <ShareButton
                  userId={userId}
                  onShareStart={() => setIsShareBlurred(true)}
                  onShareEnd={() => setIsShareBlurred(false)}
                />
              )}

              {/* Referral Progress */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Invite 2 friends to unlock Taste Matches
                </p>
                <ReferralProgress
                  completedCount={completedCount}
                  isUnlocked={isUnlocked}
                />
              </div>

              {/* Taste Comparison - shown when unlocked */}
              {isUnlocked && referrals && referrals.friends.length > 0 && (
                <div className="mt-6 animate-[fadeSlideUp_0.4s_ease-out_both]">
                  <UnlockCelebration>
                    <TasteComparison
                      userProfile={profile as unknown as TasteProfile}
                      friendProfiles={referrals.friends}
                    />
                  </UnlockCelebration>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-3 animate-[fadeSlideUp_0.4s_ease-out_0.3s_both]">
              <button
                onClick={handleViewFullResults}
                className="w-full border border-black py-3 px-6 text-sm uppercase tracking-wide hover:bg-black hover:text-white transition"
              >
                View Full Results
              </button>

              <button
                onClick={handleRetakeQuiz}
                className="w-full text-sm text-gray-500 hover:text-black transition py-2"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom keyframes */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
