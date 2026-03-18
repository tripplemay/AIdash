"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface LogDetail {
  id: string;
  projectId: string;
  actionType: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  promptLog: string | null;
  messageLog: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "修订课程框架",
  regenerate_lesson: "生成课次方案",
  revise_lesson: "修改课次方案",
  rewrite_field: "改写指定字段",
  rewrite_teaching_talk: "生成教学话术",
  validate_lesson: "课程审核",
  lesson_cover: "课次封面图",
  lesson_illustration: "课内插图",
  package_cover: "课程包封面图",
};

interface Props {
  logId: string;
  onClose: () => void;
}

export default function AiCallLogDetail({ logId, onClose }: Props) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/ai-logs/${logId}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setDetail(json.data);
        else showToast(json.error ?? "加载失败", "error");
      })
      .catch(() => showToast("加载失败", "error"))
      .finally(() => setLoading(false));
  }, [logId, showToast]);

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => showToast(`${label}已复制`, "info"),
      () => showToast("复制失败", "error"),
    );
  }

  return (
    <div className="version-panel">
      <div className="version-panel__header">
        <h3 className="version-panel__header-title">调用详情</h3>
        <button className="btn btn--soft btn--sm" onClick={onClose}>关闭</button>
      </div>

      <div className="version-panel__list" style={{ padding: "var(--sp-4)" }}>
        {loading && <div className="muted editor-empty">加载中...</div>}

        {!loading && !detail && <div className="muted editor-empty">记录不存在</div>}

        {!loading && detail && (
          <>
            {/* 元信息 */}
            <div className="ai-log-detail__meta">
              <div className="ai-log-detail__meta-row">
                <span className="ai-log-detail__meta-label">动作类型</span>
                <span>{ACTION_LABELS[detail.actionType] ?? detail.actionType}</span>
              </div>
              <div className="ai-log-detail__meta-row">
                <span className="ai-log-detail__meta-label">模型</span>
                <span className="table__cell--mono" style={{ fontSize: 12 }}>{detail.modelName}</span>
              </div>
              <div className="ai-log-detail__meta-row">
                <span className="ai-log-detail__meta-label">Token</span>
                <span>{detail.inputTokens > 0 || detail.outputTokens > 0 ? `${detail.inputTokens} 输入 / ${detail.outputTokens} 输出` : "-"}</span>
              </div>
              <div className="ai-log-detail__meta-row">
                <span className="ai-log-detail__meta-label">费用</span>
                <span>¥{detail.estimatedCost.toFixed(4)}</span>
              </div>
              <div className="ai-log-detail__meta-row">
                <span className="ai-log-detail__meta-label">时间</span>
                <span>{new Date(detail.createdAt).toLocaleString("zh-CN")}</span>
              </div>
            </div>

            {/* System Prompt */}
            <div className="ai-log-detail__section">
              <div className="ai-log-detail__section-header">
                <span className="ai-log-detail__section-title">System Prompt</span>
                {detail.promptLog && (
                  <button
                    className="btn btn--ghost btn--xs"
                    onClick={() => handleCopy(detail.promptLog!, "System Prompt")}
                  >
                    复制
                  </button>
                )}
              </div>
              <pre className="ai-log-detail__pre">
                {detail.promptLog ?? "（无记录）"}
              </pre>
            </div>

            {/* User Message */}
            <div className="ai-log-detail__section">
              <div className="ai-log-detail__section-header">
                <span className="ai-log-detail__section-title">User Message</span>
                {detail.messageLog && (
                  <button
                    className="btn btn--ghost btn--xs"
                    onClick={() => handleCopy(detail.messageLog!, "User Message")}
                  >
                    复制
                  </button>
                )}
              </div>
              <pre className="ai-log-detail__pre">
                {detail.messageLog ?? "（无记录）"}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
