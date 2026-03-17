"use client";

interface GroupedSelectProps {
  groups: { group: string; items: { key: string; label: string }[] }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GroupedSelect({
  groups,
  value,
  onChange,
  placeholder = "请选择",
}: GroupedSelectProps) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
