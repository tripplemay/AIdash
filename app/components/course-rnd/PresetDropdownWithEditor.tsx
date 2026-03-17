"use client";

import { useRef, useCallback } from "react";

interface PresetDropdownWithEditorProps {
  label: string;
  presets: { name: string; value: string }[];
  selectedPreset: string;
  textValue: string;
  onPresetChange: (name: string) => void;
  onTextChange: (text: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

export default function PresetDropdownWithEditor({
  label,
  presets,
  selectedPreset,
  textValue,
  onPresetChange,
  onTextChange,
  placeholder,
  hint,
  rows = 3,
}: PresetDropdownWithEditorProps) {
  const dirtyRef = useRef(false);

  const handlePresetSelect = useCallback(
    (name: string) => {
      if (!name) {
        onPresetChange("");
        return;
      }

      const preset = presets.find((p) => p.name === name);
      if (!preset) return;

      if (dirtyRef.current) {
        const confirmed = window.confirm("切换将覆盖已修改的内容，是否继续？");
        if (!confirmed) return;
      }

      dirtyRef.current = false;
      onPresetChange(name);
      onTextChange(preset.value);
    },
    [presets, onPresetChange, onTextChange],
  );

  const handleTextInput = useCallback(
    (text: string) => {
      dirtyRef.current = true;
      onTextChange(text);
    },
    [onTextChange],
  );

  return (
    <div>
      <label className="field-label">{label}</label>
      <select
        className="input"
        value={selectedPreset}
        onChange={(e) => handlePresetSelect(e.target.value)}
        style={{ marginBottom: "var(--sp-2)" }}
      >
        <option value="">请选择</option>
        {presets.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <textarea
        className="input"
        style={{ paddingTop: "var(--sp-2)", resize: "vertical" }}
        rows={rows}
        value={textValue}
        onChange={(e) => handleTextInput(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
