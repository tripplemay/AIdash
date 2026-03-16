"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type FilterGroup = { ageRange: string; levels: string[] };

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

      {filterTree.map(({ ageRange, levels }) => {
        const ageActive = activeAgeRange === ageRange;
        const ageHighlight = ageActive && !activeLevel;

        return (
          <div key={ageRange}>
            <button
              className={`sidebar__sub-item${ageHighlight ? " sidebar__sub-item--active" : ""}`}
              onClick={() => navigate(ageRange, "")}
            >
              {ageRange} 岁
            </button>

            {ageActive && levels.length > 0 && (
              <div style={{ paddingLeft: "var(--sp-3)", display: "flex", flexDirection: "column", gap: 2 }}>
                {levels.map(level => {
                  const levelActive = activeLevel === level;
                  return (
                    <button
                      key={level}
                      className={`sidebar__sub-item${levelActive ? " sidebar__sub-item--active" : ""}`}
                      onClick={() => navigate(ageRange, level)}
                    >
                      {level}
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
