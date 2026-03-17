"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type FilterGroup = {
  ageRange: string;
  ageRangeLabel?: string;
  levels: string[] | { key: string; label: string }[];
};

export default function SidebarFilterTree({
  filterTree,
  activeAgeRange,
  activeLevel,
}: {
  filterTree: FilterGroup[];
  activeAgeRange: string;
  activeLevel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (ageRange: string, level: string) => {
      const params = new URLSearchParams();
      if (ageRange) params.set("ageRange", ageRange);
      if (level) params.set("level", level);
      const qs = params.toString();
      router.push(`/list${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  const noFilter = !activeAgeRange && !activeLevel;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 全部课程 */}
      <button
        className={`sidebar__sub-item${noFilter ? " sidebar__sub-item--active" : ""}`}
        onClick={() => navigate("", "")}
      >
        全部课程
      </button>

      {filterTree.map((group) => {
        const { ageRange, ageRangeLabel } = group;
        const ageActive = activeAgeRange === ageRange;
        const ageHighlight = ageActive && !activeLevel;

        // 兼容旧格式（string[]）和新格式（{key, label}[]）
        const levels = group.levels.map(l =>
          typeof l === "string" ? { key: l, label: l } : l
        );

        return (
          <div key={ageRange}>
            <button
              className={`sidebar__sub-item${ageHighlight ? " sidebar__sub-item--active" : ""}`}
              onClick={() => navigate(ageRange, "")}
            >
              {ageRangeLabel ?? `${ageRange} 岁`}
            </button>

            {ageActive && levels.length > 0 && (
              <div style={{ paddingLeft: "var(--sp-3)", display: "flex", flexDirection: "column", gap: 2 }}>
                {levels.map(level => {
                  const levelActive = activeLevel === level.key;
                  return (
                    <button
                      key={level.key}
                      className={`sidebar__sub-item${levelActive ? " sidebar__sub-item--active" : ""}`}
                      onClick={() => navigate(ageRange, level.key)}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
