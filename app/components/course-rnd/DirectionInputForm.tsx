"use client";

import { useState, useEffect, useCallback } from "react";
import TagPicker from "./TagPicker";
import PresetDropdownWithEditor from "./PresetDropdownWithEditor";
import GroupedSelect from "./GroupedSelect";

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
  coreNeedsTags: string[];
  constraintsTags: string[];
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
          coreNeedsTags: d.coreNeedsTags ?? [],
          constraintsTags: d.constraintsTags ?? [],
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

  const titleError = touched && !formData.title.trim();

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>课程信息</h2>

      {/* Row 1: title + courseDirection */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-4)",
        }}
      >
        <div>
          <label className="field-label">
            项目标题 <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            className={`input${titleError ? " input--error" : ""}`}
            value={formData.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="如：AI 故事表达创作课"
          />
          {titleError && <div className="field-error-text">请输入项目标题</div>}
        </div>
        <PresetDropdownWithEditor
          label="课程方向"
          presets={options.courseDirectionPresets}
          selectedPreset={formData.courseDirectionPreset}
          textValue={formData.courseDirection}
          onPresetChange={(name) => update("courseDirectionPreset", name)}
          onTextChange={(text) => update("courseDirection", text)}
          placeholder="如：用 AI 辅助学生进行故事创作"
          rows={2}
        />
      </div>

      {/* Row 2: ageRange + level + orgForm + lessonCount */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-4)",
        }}
      >
        <div>
          <label className="field-label">年龄段</label>
          <select
            className="input"
            value={formData.ageRange}
            onChange={(e) => update("ageRange", e.target.value)}
          >
            <option value="">请选择</option>
            {options.ageRanges.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
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
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">课程组织形态</label>
          <select
            className="input"
            value={formData.orgForm}
            onChange={(e) => update("orgForm", e.target.value)}
          >
            <option value="">请选择</option>
            {options.orgForms.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
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

      {/* Row 3: deliverableType + deliverableName */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-4)",
        }}
      >
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

      {/* Row 4: imageStyle */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <PresetDropdownWithEditor
          label="图片风格"
          presets={options.imageStylePresets}
          selectedPreset={formData.imageStyle}
          textValue={formData.imageStylePrompt}
          onPresetChange={(name) => update("imageStyle", name)}
          onTextChange={(text) => update("imageStylePrompt", text)}
          placeholder="描述生成图片的风格要求"
          hint="选择预设或自定义描述，用于指导 AI 生成课程配图"
          rows={2}
        />
      </div>

      {/* Divider */}
      <div className="form-divider" />

      {/* roughFramework */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">大致框架（选填）</label>
        <textarea
          className="input"
          style={{ height: 80, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.roughFramework}
          onChange={(e) => update("roughFramework", e.target.value)}
          placeholder="如：第1课 认识AI助手 → 第2课 故事角色设计 → 第3课 场景搭建 → 第4课 作品整合发布"
        />
        <div className="field-hint">描述每课的大致主题和推进逻辑，留空则由 AI 自动规划</div>
      </div>

      {/* coreNeeds: tags + text */}
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">核心诉求（选填）</label>
        <TagPicker
          tags={options.coreNeedsTags}
          selected={formData.coreNeedsTags}
          onChange={(selected) => update("coreNeedsTags", selected)}
        />
        <textarea
          className="input"
          style={{ height: 56, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.coreNeedsText}
          onChange={(e) => update("coreNeedsText", e.target.value)}
          placeholder="补充其他诉求，如：希望融入绘本元素，适合阅读能力较弱的学生"
        />
        <div className="field-hint">选择标签或输入文字，描述对课程设计的核心要求</div>
      </div>

      {/* constraints: tags + text */}
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <label className="field-label">补充约束（选填）</label>
        <TagPicker
          tags={options.constraintsTags}
          selected={formData.constraintsTags}
          onChange={(selected) => update("constraintsTags", selected)}
        />
        <textarea
          className="input"
          style={{ height: 56, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.constraintsText}
          onChange={(e) => update("constraintsText", e.target.value)}
          placeholder="补充其他约束条件，如：教室没有投影仪，需要用平板展示"
        />
        <div className="field-hint">选择标签或输入文字，描述课程实施的限制条件</div>
      </div>

      {/* Divider */}
      <div className="form-divider" />

      {/* Generate button */}
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
