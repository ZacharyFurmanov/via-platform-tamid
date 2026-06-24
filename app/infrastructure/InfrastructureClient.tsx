"use client";

import { useEffect, useRef } from "react";
import "./infrastructure.css";
import { infraMarkup } from "./markup";
import { initInfra } from "./infraScripts";

/**
 * The VYA infrastructure landing page. The mockup's body markup is injected
 * via dangerouslySetInnerHTML inside the #infra wrapper (so its inline styles
 * and SVGs stay faithful), its CSS is scoped under #infra, and its vanilla JS
 * runs once from useEffect. Nothing here touches the existing marketplace.
 */
export default function InfrastructureClient() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // run once (guards React StrictMode double-mount in dev)
    ran.current = true;
    initInfra();
  }, []);

  return (
    <>
      {/* Fonts the scoped CSS references by family name (Playfair Display,
          Abyssinica SIL, Cormorant). React hoists these <link>s to <head>. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Abyssinica+SIL&family=Cormorant:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
      />
      <div id="infra" dangerouslySetInnerHTML={{ __html: infraMarkup }} />
    </>
  );
}
