"use client";

import { useState } from "react";

interface AvatarSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

const BOY_AVATARS = Array.from({ length: 20 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0");
  return `/avatars/boy-${num}.png`;
});

const GIRL_AVATARS = Array.from({ length: 40 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0");
  return `/avatars/girl-${num}.png`;
});

export default function AvatarSelector({ value, onChange }: AvatarSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="avatar-selector">
      {/* Current Avatar Preview */}
      <button
        type="button"
        className="avatar-selector__preview"
        onClick={() => setExpanded(v => !v)}
        title="点击选择头像"
      >
        {value ? (
          <img src={value} alt="头像" className="avatar-selector__preview-img" />
        ) : (
          <span className="avatar-selector__preview-placeholder">选择头像</span>
        )}
      </button>
      <span className="avatar-selector__label">点击选择头像</span>

      {/* Expanded Grid */}
      {expanded && (
        <div className="avatar-grid">
          <div className="avatar-grid__section">
            <div className="avatar-grid__section-title">男生</div>
            <div className="avatar-grid__items">
              {BOY_AVATARS.map(url => (
                <button
                  key={url}
                  type="button"
                  className={`avatar-grid__item${value === url ? " avatar-grid__item--selected" : ""}`}
                  onClick={() => { onChange(url); setExpanded(false); }}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className="avatar-grid__section">
            <div className="avatar-grid__section-title">女生</div>
            <div className="avatar-grid__items">
              {GIRL_AVATARS.map(url => (
                <button
                  key={url}
                  type="button"
                  className={`avatar-grid__item${value === url ? " avatar-grid__item--selected" : ""}`}
                  onClick={() => { onChange(url); setExpanded(false); }}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
