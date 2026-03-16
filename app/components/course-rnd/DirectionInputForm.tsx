"use client";

interface FormData {
  title: string;
  targetAudience: string;
  courseDirection: string;
  ageRange: string;
  level: string;
  lessonCount: number;
  coreDeliverable: string;
  roughFramework: string;
  coreNeeds: string;
  constraints: string;
}

interface Props {
  formData: FormData;
  onChange: (data: FormData) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function DirectionInputForm({ formData, onChange, onGenerate, loading }: Props) {
  const update = (key: keyof FormData, value: string | number) => {
    onChange({ ...formData, [key]: value });
  };

  return (
    <div className="card--glass" style={{ padding: "var(--sp-6)", marginBottom: "var(--sp-6)" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: "var(--sp-5)" }}>课程信息</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
        <div>
          <label className="field-label">项目标题 <span className="field-required">*</span></label>
          <input className="input" value={formData.title} onChange={e => update("title", e.target.value)} placeholder="如：AI 故事表达创作课" />
        </div>
        <div>
          <label className="field-label">课程对象</label>
          <input className="input" value={formData.targetAudience} onChange={e => update("targetAudience", e.target.value)} placeholder="如：8-12 岁小学生" />
        </div>
      </div>

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">课程方向</label>
        <input className="input" value={formData.courseDirection} onChange={e => update("courseDirection", e.target.value)} placeholder="如：用 AI 辅助学生进行故事创作" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
        <div>
          <label className="field-label">年龄段</label>
          <input className="input" value={formData.ageRange} onChange={e => update("ageRange", e.target.value)} placeholder="如：8-12" />
        </div>
        <div>
          <label className="field-label">级别</label>
          <input className="input" value={formData.level} onChange={e => update("level", e.target.value)} placeholder="如：L1" />
        </div>
        <div>
          <label className="field-label">预计课次数</label>
          <input className="input" type="number" min={1} max={20} value={formData.lessonCount} onChange={e => update("lessonCount", parseInt(e.target.value) || 4)} />
        </div>
      </div>

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">核心产出物</label>
        <input className="input" value={formData.coreDeliverable} onChange={e => update("coreDeliverable", e.target.value)} placeholder="学生最终完成的作品，如：故事介绍页" />
      </div>

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">大致框架（选填）</label>
        <textarea
          className="input"
          style={{ height: 80, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.roughFramework}
          onChange={e => update("roughFramework", e.target.value)}
          placeholder="对课程结构的初步想法"
        />
      </div>

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">核心诉求（选填）</label>
        <textarea
          className="input"
          style={{ height: 60, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.coreNeeds}
          onChange={e => update("coreNeeds", e.target.value)}
          placeholder="对课程设计的核心要求"
        />
      </div>

      <div style={{ marginBottom: "var(--sp-5)" }}>
        <label className="field-label">补充约束（选填）</label>
        <textarea
          className="input"
          style={{ height: 60, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={formData.constraints}
          onChange={e => update("constraints", e.target.value)}
          placeholder="其他限制条件"
        />
      </div>

      {loading ? (
        <div className="ai-progress" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <span className="ai-progress__spinner" />
          <span className="ai-progress__step--current">AI 正在生成课程框架...</span>
        </div>
      ) : (
        <button className="btn btn--lg" onClick={onGenerate} disabled={!formData.title}>
          生成课程框架
        </button>
      )}
    </div>
  );
}
