"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import TagPicker, { type TagItem } from "./TagPicker";
import PresetDropdownWithEditor from "./PresetDropdownWithEditor";
import GroupedSelect from "./GroupedSelect";
import { useToast } from "@/components/Toast";

export interface FormData {
  title: string;
  courseDirection: string;
  courseDirectionPreset: string;
  ageRange: string;
  level: string;
  orgForm: string;
  lessonCount: number;
  deliverableType: string;
  deliverableName: string;
  imageStyle: string;
  imageStylePrompt: string;
  roughFramework: string;
  coreNeedsTags: string[];
  coreNeedsText: string;
  constraintsTags: string[];
  constraintsText: string;
}

interface Props {
  formData: FormData;
  onChange: (data: FormData) => void;
  onGenerate: () => void;
  loading: boolean;
}

interface FormOptions {
  courseDirectionPresets: { name: string; value: string }[];
  ageRanges: { key: string; label: string }[];
  levels: { key: string; label: string }[];
  orgForms: { key: string; label: string }[];
  deliverableGroups: { group: string; items: { key: string; label: string }[] }[];
  imageStylePresets: { name: string; value: string }[];
  coreNeedsTags: TagItem[];
  constraintsTags: TagItem[];
}

const EMPTY_OPTIONS: FormOptions = {
  courseDirectionPresets: [],
  ageRanges: [],
  levels: [],
  orgForms: [],
  deliverableGroups: [],
  imageStylePresets: [],
  coreNeedsTags: [],
  constraintsTags: [],
};

export default function DirectionInputForm({ formData, onChange, onGenerate, loading }: Props) {
  const [touched, setTouched] = useState(false);
  const [options, setOptions] = useState<FormOptions>(EMPTY_OPTIONS);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/course-rnd/form-options")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const d = json.data ?? json;
        setOptions({
          ageRanges: d.ageRanges ?? [],
          levels: d.levels ?? [],
          orgForms: d.orgForms ?? [],
          deliverableGroups: d.deliverableTypes ?? [],
          courseDirectionPresets: d.courseDirections ?? [],
          imageStylePresets: d.imageStyles ?? [],
          coreNeedsTags: (d.coreNeedsTags ?? []).map((t: string | TagItem) =>
            typeof t === "string" ? { name: t, value: t } : t
          ),
          constraintsTags: (d.constraintsTags ?? []).map((t: string | TagItem) =>
            typeof t === "string" ? { name: t, value: t } : t
          ),
        });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      onChange({ ...formData, [key]: value });
    },
    [formData, onChange],
  );

  const handleGenerate = () => {
    setTouched(true);
    if (!formData.title.trim()) return;
    onGenerate();
  };

  async function handleGenerateTitle() {
    setGeneratingTitle(true);
    try {
      const res = await fetch("/api/course-rnd/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseDirection: formData.courseDirection,
          ageRange: formData.ageRange,
          level: formData.level,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.title) {
        update("title", json.data.title);
      } else {
        showToast(json.error ?? "生成失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setGeneratingTitle(false);
    }
  }

  const titleError = touched && !formData.title.trim();

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>

      {/* ── 第一组：课程定位 ── */}
      <div className="form-section">
        <h3 className="form-section__title">课程定位</h3>

        {/* 年龄段 + 难度级别 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
          <div>
            <label className="field-label">年龄段</label>
            <select
              className="input"
              value={formData.ageRange}
              onChange={(e) => update("ageRange", e.target.value)}
            >
              <option value="">请选择</option>
              {options.ageRanges.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">难度级别</label>
            <select
              className="input"
              value={formData.level}
              onChange={(e) => update("level", e.target.value)}
            >
              <option value="">请选择</option>
              {options.levels.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 课程方向（全宽） */}
        <div style={{ marginBottom: "var(--sp-4)" }}>
          <PresetDropdownWithEditor
            label="课程方向"
            presets={options.courseDirectionPresets}
            selectedPreset={formData.courseDirectionPreset}
            textValue={formData.courseDirection}
            onPresetChange={(name) => update("courseDirectionPreset", name)}
            onTextChange={(text) => update("courseDirection", text)}
            placeholder="如：用 AI 辅助学生进行故事创作"
            rows={3}
          />
        </div>

        {/* 项目标题 + AI 生成按钮 */}
        <div>
          <label className="field-label">
            项目标题 <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <input
              className={`input${titleError ? " input--error" : ""}`}
              style={{ flex: 1 }}
              value={formData.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="如：AI 故事表达创作课"
            />
            <button
              className="btn btn--soft btn--sm"
              onClick={handleGenerateTitle}
              disabled={generatingTitle}
              title="AI 生成课程名称"
              style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "var(--sp-1)" }}
            >
              <Sparkles size={14} />
              {generatingTitle ? "生成中..." : "AI 生成"}
            </button>
          </div>
          {titleError && <div className="field-error-text">请输入项目标题</div>}
        </div>
      </div>

      {/* ── 第二组：课程结构 ── */}
      <div className="form-section">
        <h3 className="form-section__title">课程结构</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
          <div>
            <label className="field-label">课程组织形态</label>
            <select
              className="input"
              value={formData.orgForm}
              onChange={(e) => update("orgForm", e.target.value)}
            >
              <option value="">请选择</option>
              {options.orgForms.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">预计课次数</label>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              value={formData.lessonCount}
              onChange={(e) => update("lessonCount", parseInt(e.target.value) || 4)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
          <div>
            <label className="field-label">产出物形态</label>
            <GroupedSelect
              groups={options.deliverableGroups}
              value={formData.deliverableType}
              onChange={(val) => update("deliverableType", val)}
              placeholder="请选择产出物类型"
            />
          </div>
          <div>
            <label className="field-label">产出物名称</label>
            <input
              className="input"
              value={formData.deliverableName}
              onChange={(e) => update("deliverableName", e.target.value)}
              placeholder="如：故事介绍页"
            />
          </div>
        </div>
      </div>

      {/* ── 第三组：视觉风格 ── */}
      <div className="form-section">
        <h3 className="form-section__title">视觉风格</h3>
        <PresetDropdownWithEditor
          label="图片风格"
          presets={options.imageStylePresets}
          selectedPreset={formData.imageStyle}
          textValue={formData.imageStylePrompt}
          onPresetChange={(name) => update("imageStyle", name)}
          onTextChange={(text) => update("imageStylePrompt", text)}
          placeholder="描述生成图片的风格要求"
          hint="选择预设或自定义描述，用于指导 AI 生成课程配图"
          rows={3}
        />
      </div>

      {/* ── 第四组：补充信息 ── */}
      <div className="form-section">
        <h3 className="form-section__title">补充信息（选填）</h3>

        <div style={{ marginBottom: "var(--sp-4)" }}>
          <label className="field-label">大致框架</label>
          <textarea
            className="input"
            style={{ height: 80, paddingTop: "var(--sp-2)", resize: "vertical" }}
            value={formData.roughFramework}
            onChange={(e) => update("roughFramework", e.target.value)}
            placeholder="如：第1课 认识AI助手 → 第2课 故事角色设计 → 第3课 场景搭建 → 第4课 作品整合发布"
          />
          <div className="field-hint">描述每课的大致主题和推进逻辑，留空则由 AI 自动规划</div>
        </div>

        <div style={{ marginBottom: "var(--sp-4)" }}>
          <label className="field-label">核心诉求</label>
          <TagPicker
            tags={options.coreNeedsTags}
            selected={formData.coreNeedsTags}
            onChange={(selected) => {
              const tagTexts = selected
                .map((name) => options.coreNeedsTags.find((t) => t.name === name)?.value)
                .filter(Boolean)
                .join("\n");
              onChange({ ...formData, coreNeedsTags: selected, coreNeedsText: tagTexts });
            }}
          />
          <textarea
            className="input"
            style={{ height: 80, paddingTop: "var(--sp-2)", resize: "vertical" }}
            value={formData.coreNeedsText}
            onChange={(e) => update("coreNeedsText", e.target.value)}
            placeholder="选择上方标签自动填入描述，也可直接编辑补充"
          />
        </div>

        <div>
          <label className="field-label">补充约束</label>
          <TagPicker
            tags={options.constraintsTags}
            selected={formData.constraintsTags}
            onChange={(selected) => {
              const tagTexts = selected
                .map((name) => options.constraintsTags.find((t) => t.name === name)?.value)
                .filter(Boolean)
                .join("\n");
              onChange({ ...formData, constraintsTags: selected, constraintsText: tagTexts });
            }}
          />
          <textarea
            className="input"
            style={{ height: 80, paddingTop: "var(--sp-2)", resize: "vertical" }}
            value={formData.constraintsText}
            onChange={(e) => update("constraintsText", e.target.value)}
            placeholder="选择上方标签自动填入描述，也可直接编辑补充"
          />
        </div>
      </div>

      {/* ── 生成按钮 ── */}
      <div style={{ marginTop: "var(--sp-4)" }}>
        {loading ? (
          <div className="ai-progress" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span className="ai-progress__spinner" />
            <span className="ai-progress__step--current">AI 正在生成课程框架...</span>
          </div>
        ) : (
          <button className="btn btn--lg" onClick={handleGenerate} disabled={loading}>
            生成课程框架
          </button>
        )}
      </div>
    </div>
  );
}
