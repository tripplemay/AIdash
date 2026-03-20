"use client";

import type { AccordionBlock as AccordionBlockType, Block, BoxBlock, Hero, LessonContent, Section, ToolPlanSummary, ToolUsage } from "@/types/lesson-content";
import CopyButton from "./CopyButton";
import LessonToc from "./LessonToc";
import { useActiveSection } from "./useActiveSection";

/* ── Inline bold renderer ── */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

/* ── Pill ── */
function Pill({ text, color = "default" }: { text: string; color?: string }) {
  return <span className="pill lesson-pill">{text}</span>;
}

/* ── Box variant ── */
const BOX_CLS: Record<string, string> = {
  default: "",
  danger:  "lesson-block--box--danger",
  success: "lesson-block--box--success",
  note:    "lesson-block--box--note",
};

/* ── Block renderers ── */

function TextBlockR({ block }: { block: { content: string } }) {
  return <p className="lesson-block--text">{renderInline(block.content)}</p>;
}

function QuoteBlockR({ block }: { block: { content: string } }) {
  return <div className="lesson-block--quote">{block.content}</div>;
}

function ListBlockR({ block }: { block: { ordered: boolean; items: string[] } }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className="lesson-block--list">
      {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
    </Tag>
  );
}

function TemplateBlockR({ block }: { block: { label?: string; content: string } }) {
  return (
    <div className="lesson-block--template">
      {block.label && (
        <div className="lesson-block--template__label">
          <span>{block.label}</span>
          <CopyButton text={block.content} />
        </div>
      )}
      <div className="lesson-block--template__body">{block.content}</div>
      {!block.label && (
        <div className="lesson-block--template__footer">
          <CopyButton text={block.content} />
        </div>
      )}
    </div>
  );
}

function QaPairBlockR({ block }: { block: { question: string; answer: string } }) {
  return (
    <div className="lesson-block--qa">
      <div className="lesson-block--qa__question">{block.question}</div>
      <p className="lesson-block--qa__answer">{block.answer}</p>
    </div>
  );
}

function BlocksR({ blocks, toolPlan }: { blocks: Block[]; toolPlan?: ToolPlanSummary | null }) {
  if (!blocks || !Array.isArray(blocks)) return null;
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":      return <TextBlockR     key={i} block={block} />;
          case "quote":     return <QuoteBlockR    key={i} block={block} />;
          case "list":      return <ListBlockR     key={i} block={block} />;
          case "template":  return <TemplateBlockR key={i} block={block} />;
          case "box":       return <BoxBlockR      key={i} block={block} />;
          case "grid":      return <GridBlockR     key={i} block={block} />;
          case "accordion": return <AccordionBlockR key={i} block={block as AccordionBlockType} toolPlan={toolPlan} />;
          case "qa_pair":   return <QaPairBlockR   key={i} block={block} />;
          default:          return null;
        }
      })}
    </>
  );
}

function BoxBlockR({ block }: { block: BoxBlock }) {
  const cls = BOX_CLS[block.variant ?? "default"] ?? "";
  return (
    <div className={`lesson-block--box ${cls}`}>
      {block.pill && <Pill text={block.pill.text} color={block.pill.color} />}
      {block.title && <h3 className="lesson-block--box__title">{block.title}</h3>}
      <BlocksR blocks={block.blocks} />
    </div>
  );
}

function GridBlockR({ block }: { block: { cols: 2 | 3; items: BoxBlock[] } }) {
  return (
    <div className={`lesson-block--grid lesson-block--grid--${block.cols}`}>
      {block.items.map((item, i) => <BoxBlockR key={i} block={item} />)}
    </div>
  );
}

/* ── Tool usage block (inside accordion) ── */
function ToolUsageBlockR({ toolUsage, toolPlan }: { toolUsage: ToolUsage; toolPlan?: ToolPlanSummary | null }) {
  // 从顶层 toolPlan 查找同类型的备选工具
  const planItem = toolPlan?.tools.find(t => t.toolType === toolUsage.toolType);
  const alternatives = planItem?.alternatives.filter(a => a !== toolUsage.toolName) ?? [];

  return (
    <div className="lesson-tool-usage">
      <div className="lesson-tool-usage__title">本环节工具使用</div>
      <div className="lesson-tool-usage__grid">
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">工具类型</span>
          <span className="lesson-tool-usage__value">{toolUsage.toolType}</span>
        </div>
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">推荐工具</span>
          <span className="lesson-tool-usage__value">
            <strong>{toolUsage.toolName}</strong>
            {alternatives.length > 0 && (
              <span className="lesson-tool-usage__alt">（同类可选：{alternatives.join(" / ")}）</span>
            )}
          </span>
        </div>
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">进入方式</span>
          <span className="lesson-tool-usage__value">{toolUsage.entryMethod}</span>
        </div>
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">操作</span>
          <span className="lesson-tool-usage__value">{toolUsage.operator}</span>
        </div>
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">学生参与</span>
          <span className="lesson-tool-usage__value">{toolUsage.studentAction}</span>
        </div>
        <div className="lesson-tool-usage__row">
          <span className="lesson-tool-usage__label">替代方案</span>
          <span className="lesson-tool-usage__value">{toolUsage.fallback}</span>
        </div>
      </div>
    </div>
  );
}

function AccordionBlockR({ block, toolPlan }: { block: AccordionBlockType; toolPlan?: ToolPlanSummary | null }) {
  return (
    <details open className="lesson-block--accordion">
      <summary className="lesson-block--accordion__summary">
        <span>{block.title}</span>
        <span className="pill lesson-accordion__time">{block.time}</span>
      </summary>
      <div className="lesson-block--accordion__body">
        <BlocksR blocks={block.blocks} />
        {block.toolUsage && <ToolUsageBlockR toolUsage={block.toolUsage} toolPlan={toolPlan} />}
      </div>
    </details>
  );
}

/* ── Tool plan overview (below hero) ── */
function ToolPlanOverview({ toolPlan }: { toolPlan: ToolPlanSummary }) {
  if (!toolPlan.tools || toolPlan.tools.length === 0) return null;

  const cols = Math.min(toolPlan.tools.length, 3) as 2 | 3;

  return (
    <div className="lesson-tool-plan">
      <div className="lesson-tool-plan__header">AI 工具与操作总览</div>
      <div className="lesson-tool-plan__body">
        <div className={`lesson-block--grid lesson-block--grid--${cols}`}>
          {toolPlan.tools.map((tool, i) => (
            <div key={i} className="lesson-block--box lesson-tool-plan__card">
              <div className="lesson-tool-plan__type">{tool.toolType}</div>
              <div className="lesson-tool-plan__recommended">
                <span className="lesson-tool-plan__star">★</span> 推荐：<strong>{tool.recommended}</strong>
              </div>
              {tool.alternatives.length > 0 && (
                <div className="lesson-tool-plan__alternatives">
                  ○ 备选：{tool.alternatives.join(" / ")}
                </div>
              )}
              <div className="lesson-tool-plan__purpose">用途：{tool.purpose}</div>
              {tool.usedInFlows.length > 0 && (
                <div className="lesson-tool-plan__flows">环节：{tool.usedInFlows.join("、")}</div>
              )}
            </div>
          ))}
        </div>
        <div className="lesson-tool-plan__meta">
          <div className="lesson-tool-plan__meta-row">
            <span className="lesson-tool-plan__meta-label">操作方式</span>
            <span>{toolPlan.operator}</span>
          </div>
          <div className="lesson-tool-plan__meta-row">
            <span className="lesson-tool-plan__meta-label">学生参与</span>
            <span>{toolPlan.studentMode}</span>
          </div>
          <div className="lesson-tool-plan__meta-row">
            <span className="lesson-tool-plan__meta-label">工具不可用时</span>
            <span>{toolPlan.fallback}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section panel ── */
function SectionPanel({ section, index, toolPlan }: { section: Section; index: number; toolPlan?: ToolPlanSummary | null }) {
  return (
    <section id={section.id} className="lesson-section">
      <div className="lesson-section__header">
        {index + 1}. {section.title}
      </div>
      <div className="lesson-section__body">
        <BlocksR blocks={section.blocks} toolPlan={toolPlan} />
      </div>
    </section>
  );
}

/* ── Hero ── */
function HeroSection({ hero }: { hero: Hero }) {
  return (
    <div className="lesson-hero">
      <div className="lesson-hero__inner">
        {hero.imageUrl && (
          <div id="hero_image" className="lesson-hero__image-wrap">
            <img src={hero.imageUrl} alt={hero.title} className="lesson-hero__image" />
          </div>
        )}
        <div className="lesson-hero__tags">
          {hero.tags.map(tag => (
            <span key={tag} className="lesson-hero__tag">{tag}</span>
          ))}
        </div>

        <h1 className="lesson-hero__title">{hero.title}</h1>
        <p className="lesson-hero__subtitle">{hero.subtitle}</p>

        <div className="lesson-hero__cards">
          <div className="lesson-hero__card">
            <div className="lesson-hero__card-label">一句话目标</div>
            <div className="lesson-hero__card-value">{hero.goal}</div>
          </div>
          <div className="lesson-hero__card">
            <div className="lesson-hero__card-label">唯一核心成果</div>
            <div className="lesson-hero__card-value">{hero.outcome}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main renderer ── */
export default function LessonRenderer({ content, preview = false }: { content: LessonContent; preview?: boolean }) {
  const sectionIds = content.sections.map(s => s.id);
  const tocSections = content.sections.map(s => ({ id: s.id, title: s.title }));
  const activeId = useActiveSection(preview ? [] : sectionIds);

  // 预览模式：无 TOC、无双列布局、紧凑间距
  if (preview) {
    return (
      <div style={{ padding: "var(--sp-4)" }}>
        <HeroSection hero={content.hero} />
        {content.toolPlan && <ToolPlanOverview toolPlan={content.toolPlan} />}
        <div style={{ marginTop: "var(--sp-4)" }}>
          {content.sections.map((section, i) => (
            <SectionPanel key={section.id} section={section} index={i} toolPlan={content.toolPlan} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-content">
      <HeroSection hero={content.hero} />
      {content.toolPlan && <ToolPlanOverview toolPlan={content.toolPlan} />}

      <div className="lesson-layout">
        {/* Sticky TOC */}
        <div className="card--glass lesson-toc-wrap">
          <LessonToc sections={tocSections} activeId={activeId} />
        </div>

        {/* Section panels */}
        <div>
          {content.sections.map((section, i) => (
            <SectionPanel key={section.id} section={section} index={i} toolPlan={content.toolPlan} />
          ))}
        </div>
      </div>
    </div>
  );
}
