"use client";

export interface TagItem {
  name: string;
  value: string;
}

interface TagPickerProps {
  tags: TagItem[];
  selected: string[];        // selected tag names
  onChange: (selected: string[]) => void;
}

export default function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  const toggle = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter((t) => t !== name)
      : [...selected, name];
    onChange(next);
  };

  return (
    <div className="tag-picker">
      {tags.map((tag) => (
        <button
          key={tag.name}
          type="button"
          className={`tag-picker__chip${selected.includes(tag.name) ? " tag-picker__chip--selected" : ""}`}
          onClick={() => toggle(tag.name)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
