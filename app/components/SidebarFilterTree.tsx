"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (ageRange: string, level: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ageRange) {
        params.set("ageRange", ageRange);
      } else {
        params.delete("ageRange");
      }
      if (level) {
        params.set("level", level);
      } else {
        params.delete("level");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div style={{ padding: "0 8px 8px" }}>
      <div style={{
        background: "rgba(255,255,255,0.42)",
        border: "1px solid #e6ecff",
        borderRadius: 14,
        padding: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>课程包</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>按年龄段与级别浏览</div>

        {filterTree.map(({ ageRange, levels }) => {
          const ageActive = activeAgeRange === ageRange;
          return (
            <div key={ageRange}>
              <button
                onClick={() => navigate(ageActive ? "" : ageRange, "")}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 10,
                  fontSize: 13, fontWeight: 700,
                  color: ageActive ? "#5f79ef" : "var(--muted)",
                  background: ageActive ? "#eef3ff" : "rgba(255,255,255,0.6)",
                  border: "none", cursor: "pointer",
                  marginBottom: 4, transition: "all 0.15s ease",
                }}
              >
                {ageRange} 岁
              </button>

              {ageActive && levels.length > 0 && (
                <div style={{
                  paddingLeft: 10, borderLeft: "1px solid #dfe7ff",
                  marginLeft: 8, marginBottom: 4, display: "grid", gap: 3,
                }}>
                  {levels.map(level => {
                    const levelActive = activeLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => navigate(ageRange, levelActive ? "" : level)}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "6px 10px", borderRadius: 9,
                          fontSize: 12, fontWeight: levelActive ? 700 : 400,
                          color: levelActive ? "#5f79ef" : "var(--muted)",
                          background: levelActive ? "#eef3ff" : "transparent",
                          border: "none", cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
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
    </div>
  );
}
