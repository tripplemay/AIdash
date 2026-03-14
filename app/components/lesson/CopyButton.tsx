"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: 700,
        border: "1px solid #c7d2fe",
        borderRadius: 8,
        background: copied ? "#e8f6ff" : "rgba(255,255,255,0.8)",
        color: copied ? "#0f6fb8" : "#6c4fe0",
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {copied ? "✓ 已复制" : "复制"}
    </button>
  );
}
