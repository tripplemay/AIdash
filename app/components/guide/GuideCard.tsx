"use client";

interface GuideCardProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

export default function GuideCard({ step, title, children }: GuideCardProps) {
  return (
    <div className="guide-card">
      <h3 className="guide-card__title">
        <span className="guide-card__icon">{step}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
