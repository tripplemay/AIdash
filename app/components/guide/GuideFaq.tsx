"use client";

interface GuideFaqProps {
  question: string;
  children: React.ReactNode;
}

export default function GuideFaq({ question, children }: GuideFaqProps) {
  return (
    <details className="guide-faq">
      <summary className="guide-faq__question">{question}</summary>
      <div className="guide-faq__answer">{children}</div>
    </details>
  );
}
