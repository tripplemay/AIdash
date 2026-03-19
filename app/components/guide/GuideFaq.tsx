"use client";

interface GuideFaqProps {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function GuideFaq({ question, children, defaultOpen }: GuideFaqProps) {
  return (
    <details className="guide-faq" open={defaultOpen}>
      <summary className="guide-faq__question">{question}</summary>
      <div className="guide-faq__answer">{children}</div>
    </details>
  );
}
