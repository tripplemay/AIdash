"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import DiffView from "./DiffView";
import type { DiffHunk } from "@/lib/diff-utils";

interface Version {
  id: string;
  versionNo: number;
  content: string;
  editSummary: string | null;
  createdAt: string;
}

interface Props {
  entityType: "baseline" | "template";
  entityId: string;
  onClose: () => void;
}

export default function VersionHistoryPanel({ entityType, entityId, onClose }: Props) {
  const { showToast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [diffData, setDiffData] = useState<{
    hunks: DiffHunk[];
    v1Label: string;
    v2Label: string;
  } | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchVersions() {
    setLoading(true);
    try {
      const endpoint =
        entityType === "baseline"
          ? `/api/admin/baselines/${entityId}/versions`
          : `/api/admin/prompt-templates/${entityId}/versions`;
      const res = await fetch(endpoint);
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "加载失败", "error");
        return;
      }
      setVersions(json.data ?? []);
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  async function handleCompare() {
    if (selectedIds.length !== 2) return;

    const v1 = versions.find((v) => v.id === selectedIds[0]);
    const v2 = versions.find((v) => v.id === selectedIds[1]);
    if (!v1 || !v2) return;

    try {
      const endpoint =
        entityType === "baseline"
          ? `/api/admin/baselines/${entityId}/diff`
          : `/api/admin/prompt-templates/${entityId}/diff`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId1: v1.id, versionId2: v2.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "对比失败", "error");
        return;
      }
      setDiffData({
        hunks: json.data?.hunks ?? [],
        v1Label: `v${v1.versionNo}`,
        v2Label: `v${v2.versionNo}`,
      });
    } catch {
      showToast("对比失败", "error");
    }
  }

  async function handleRollback(versionId: string) {
    if (!confirm("确认回滚到此版本？")) return;

    setRollingBack(versionId);
    try {
      const endpoint =
        entityType === "baseline"
          ? `/api/admin/baselines/${entityId}/rollback`
          : `/api/admin/prompt-templates/${entityId}/rollback`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        return;
      }
      showToast("回滚成功");
      await fetchVersions();
    } catch {
      showToast("操作失败", "error");
    } finally {
      setRollingBack(null);
    }
  }

  const isLatest = (v: Version) => versions.length > 0 && versions[0].id === v.id;

  return (
    <>
      <div className="version-panel">
        <div className="version-panel__header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>版本历史</h3>
          <button className="btn btn--soft btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>

        {selectedIds.length === 2 && (
          <div style={{ padding: "0 var(--sp-4) var(--sp-3)" }}>
            <button className="btn btn--sm" onClick={handleCompare}>
              对比选中的两个版本
            </button>
          </div>
        )}

        <div className="version-panel__list">
          {loading && (
            <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
              加载中...
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
              暂无版本记录
            </div>
          )}

          {versions.map((v) => (
            <div key={v.id} className="version-panel__item">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(v.id)}
                  onChange={() => toggleSelect(v.id)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    v{v.versionNo}
                    {isLatest(v) && (
                      <span
                        style={{
                          marginLeft: "var(--sp-2)",
                          fontSize: 11,
                          color: "var(--accent)",
                          fontWeight: 400,
                        }}
                      >
                        (当前)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {new Date(v.createdAt).toLocaleString("zh-CN")}
                  </div>
                  {v.editSummary && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {v.editSummary}
                    </div>
                  )}
                </div>
              </div>

              {!isLatest(v) && (
                <button
                  className="btn btn--soft btn--xs"
                  onClick={() => handleRollback(v.id)}
                  disabled={rollingBack === v.id}
                >
                  {rollingBack === v.id ? "回滚中..." : "回滚"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {diffData && (
        <DiffView
          hunks={diffData.hunks}
          v1Label={diffData.v1Label}
          v2Label={diffData.v2Label}
          onClose={() => setDiffData(null)}
        />
      )}
    </>
  );
}
