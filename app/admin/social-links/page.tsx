"use client";

import { useState } from "react";
import AdminNav from "@/app/components/AdminNav";

const MAROON = "#5D0F17";
const CREAM = "#F7F3EA";
const BASE = "https://vyaplatform.com";

type LinkEntry = {
  label: string;
  url: string;
  note: string;
};

type Channel = {
  name: string;
  icon: string;
  links: LinkEntry[];
};

const CHANNELS: Channel[] = [
  {
    name: "Instagram",
    icon: "📸",
    links: [
      {
        label: "Bio link",
        url: `${BASE}?utm_source=instagram&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your Instagram profile website field",
      },
      {
        label: "Caption / story link",
        url: `${BASE}?utm_source=instagram&utm_medium=social&utm_campaign=post`,
        note: "Use in post captions or story link stickers",
      },
    ],
  },
  {
    name: "TikTok",
    icon: "🎵",
    links: [
      {
        label: "Bio link",
        url: `${BASE}?utm_source=tiktok&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your TikTok profile website field",
      },
      {
        label: "Video description link",
        url: `${BASE}?utm_source=tiktok&utm_medium=social&utm_campaign=post`,
        note: "Use in video descriptions",
      },
    ],
  },
  {
    name: "Twitter / X",
    icon: "🐦",
    links: [
      {
        label: "Bio link",
        url: `${BASE}?utm_source=twitter&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your X profile website field",
      },
      {
        label: "Tweet link",
        url: `${BASE}?utm_source=twitter&utm_medium=social&utm_campaign=post`,
        note: "Use in tweets",
      },
    ],
  },
  {
    name: "LinkedIn",
    icon: "💼",
    links: [
      {
        label: "Profile link",
        url: `${BASE}?utm_source=linkedin&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your LinkedIn website field",
      },
      {
        label: "Post link",
        url: `${BASE}?utm_source=linkedin&utm_medium=social&utm_campaign=post`,
        note: "Use in LinkedIn posts",
      },
    ],
  },
  {
    name: "Threads",
    icon: "🧵",
    links: [
      {
        label: "Bio link",
        url: `${BASE}?utm_source=threads&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your Threads profile link",
      },
    ],
  },
  {
    name: "Pinterest",
    icon: "📌",
    links: [
      {
        label: "Profile link",
        url: `${BASE}?utm_source=pinterest&utm_medium=social&utm_campaign=bio`,
        note: "Paste into your Pinterest website field",
      },
      {
        label: "Pin link",
        url: `${BASE}?utm_source=pinterest&utm_medium=social&utm_campaign=post`,
        note: "Use as the destination URL for pins",
      },
    ],
  },
  {
    name: "Substack",
    icon: "📰",
    links: [
      {
        label: "Newsletter link",
        url: `${BASE}?utm_source=substack&utm_medium=email&utm_campaign=newsletter`,
        note: "Use in your Substack posts",
      },
    ],
  },
];

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "6px 14px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        background: copied ? "#15803d" : MAROON,
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SocialLinksPage() {
  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <AdminNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: MAROON, margin: "0 0 8px" }}>
          Social Media Links
        </h1>
        <p style={{ fontSize: 14, color: "rgba(93,15,23,0.55)", margin: "0 0 12px" }}>
          Use these links wherever you post — they automatically track which platform drove traffic to VYA.
          Set each one in your bio <em>once</em> and you&apos;re done.
        </p>

        {/* How it works */}
        <div style={{ background: "#fff", border: "1px solid rgba(93,15,23,0.1)", borderRadius: 8, padding: "16px 20px", marginBottom: 36 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: MAROON, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            How attribution works
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li style={{ fontSize: 13, color: "rgba(93,15,23,0.7)" }}>
              <strong>Bio links below</strong> — paste the UTM link into your profile once; every click is automatically tagged.
            </li>
            <li style={{ fontSize: 13, color: "rgba(93,15,23,0.7)" }}>
              <strong>Organic shares</strong> — when someone shares <code style={{ fontSize: 12, background: "#f3f4f6", padding: "1px 5px", borderRadius: 3 }}>vyaplatform.com</code> without any UTM params, we automatically infer the source from their browser&apos;s referrer (works for most platforms).
            </li>
            <li style={{ fontSize: 13, color: "rgba(93,15,23,0.7)" }}>
              <strong>View results</strong> — traffic by source appears in the Analytics page under Traffic Sources.
            </li>
          </ul>
        </div>

        {/* Channel cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {CHANNELS.map((channel) => (
            <div
              key={channel.name}
              style={{ background: "#fff", border: "1px solid rgba(93,15,23,0.1)", borderRadius: 10, padding: "20px 24px" }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: MAROON, margin: "0 0 16px" }}>
                {channel.icon} {channel.name}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {channel.links.map((link) => (
                  <div key={link.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(93,15,23,0.45)", margin: "0 0 6px" }}>
                      {link.label}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <code
                        style={{
                          fontSize: 12,
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: 5,
                          padding: "7px 12px",
                          color: "#374151",
                          flex: 1,
                          overflowX: "auto",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {link.url}
                      </code>
                      <CopyButton url={link.url} />
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(93,15,23,0.4)", margin: "5px 0 0" }}>{link.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
