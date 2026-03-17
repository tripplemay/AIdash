"use client";

interface TagPickerProps {
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  const toggle = (tag: string) => {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next);
  };

  return (
    <div className="tag-picker">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`tag-picker__chip${selected.includes(tag) ? " tag-picker__chip--selected" : ""}`}
          onClick={() => toggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
