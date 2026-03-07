"use client";

import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getFirebaseApp } from "./firebase";

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (!supported) return null;
      return getAnalytics(getFirebaseApp());
    });
  }

  return analyticsPromise;
}
