"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ModelOption {
  id: string;
  name: string;
  pricing?: { inputPerM: number; outputPerM: number };
}

interface Props {
  models: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function ModelCombobox({ models, value, onChange, placeholder = "搜索或输入模型 ID", loading }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => { setQuery(value); }, [value]);

  const filtered = models.filter(m =>
    m.id.toLowerCase().includes(query.toLowerCase()) ||
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((id: string) => {
    setQuery(id);
    onChange(id);
    setOpen(false);
    setHighlightIdx(-1);
  }, [onChange]);

  function handleInputChange(val: string) {
    setQuery(val);
    onChange(val);
    setOpen(true);
    setHighlightIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && e.key === "ArrowDown") {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={wrapperRef} className="combobox">
      <input
        className="combobox__input"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => { if (models.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={loading ? "加载模型列表..." : placeholder}
        disabled={loading}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="combobox__dropdown" role="listbox">
          {filtered.slice(0, 50).map((m, i) => (
            <div
              key={m.id}
              className={`combobox__item${i === highlightIdx ? " combobox__item--highlighted" : ""}`}
              role="option"
              aria-selected={i === highlightIdx}
              onMouseDown={() => handleSelect(m.id)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span className="combobox__item-id">{m.id}</span>
              {m.pricing && (
                <span className="combobox__price">
                  ${m.pricing.inputPerM.toFixed(2)} / ${m.pricing.outputPerM.toFixed(2)}
                </span>
              )}
            </div>
          ))}
          {filtered.length > 50 && (
            <div className="combobox__empty">还有 {filtered.length - 50} 个结果，请缩小搜索范围</div>
          )}
        </div>
      )}
      {open && query && filtered.length === 0 && models.length > 0 && (
        <div className="combobox__dropdown">
          <div className="combobox__empty">未匹配到模型，将使用输入的 ID</div>
        </div>
      )}
    </div>
  );
}
