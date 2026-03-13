"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function PackageFilters({
  q,
  ageRange,
}: {
  q: string;
  ageRange: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input
        placeholder="搜索课程包"
        defaultValue={q}
        onChange={e => updateParam("q", e.target.value)}
        style={{
          height: 48, borderRadius: 14,
          border: "1px solid var(--line)",
          background: "rgba(240,244,255,0.76)",
          padding: "0 16px", fontSize: 14,
          color: "var(--text)", outline: "none",
          width: 220,
        }}
      />
      <select
        value={ageRange}
        onChange={e => updateParam("ageRange", e.target.value)}
        style={{
          height: 44, minWidth: 130, padding: "0 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.82)",
          fontSize: 13, cursor: "pointer",
          color: ageRange ? "var(--text)" : "var(--muted)",
        }}
      >
        <option value="">年龄段 ▾</option>
        <option value="6-7">6–7 岁</option>
        <option value="8-12">8–12 岁</option>
      </select>
    </div>
  );
}
