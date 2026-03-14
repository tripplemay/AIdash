import type { Block, BoxBlock, Hero, LessonContent, Section } from "@/types/lesson-content";
import CopyButton from "./CopyButton";
import LessonToc from "./LessonToc";

// ── Inline bold renderer ──────────────────────────────────────────────────────
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
const PILL_STYLES: Record<string, { background: string; color: string }> = {
  blue:    { background: "#e6f5ff", color: "#0f6fb8" },
  violet:  { background: "#f1edff", color: "#6c4fe0" },
  yellow:  { background: "#fff7d6", color: "#9f7700" },
  green:   { background: "#ebfaef", color: "#19733a" },
  default: { background: "#f3f4f6", color: "#374151" },
};

function Pill({ text, color = "default" }: { text: string; color?: string }) {
  const s = PILL_STYLES[color] ?? PILL_STYLES.default;
  return (
    <span style={{
      display: "inline-block", padding: "5px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700, marginBottom: 10, ...s,
    }}>
      {text}
    </span>
  );
}

// ── Box variant styles ────────────────────────────────────────────────────────
const BOX_VARIANT: Record<string, { background: string; borderColor: string }> = {
  default: { background: "#fff",     borderColor: "#e5e7eb" },
  danger:  { background: "#fff1f1",  borderColor: "#ffd6d6" },
  success: { background: "#eefcf1",  borderColor: "#d2f3da" },
  note:    { background: "#fff9eb",  borderColor: "#ffe8a6" },
};

// ── Block renderers ───────────────────────────────────────────────────────────

function TextBlockR({ block }: { block: { content: string } }) {
  return (
    <p style={{ margin: "6px 0", fontSize: 15, lineHeight: 1.75, color: "var(--text)" }}>
      {renderInline(block.content)}
    </p>
  );
}

function QuoteBlockR({ block }: { block: { content: string } }) {
  return (
    <div style={{
      background: "linear-gradient(135deg,#eef8ff,#f5f1ff)",
      border: "1px solid #dbeafe", borderRadius: 18, padding: "16px 18px",
      fontSize: 15, lineHeight: 1.75, margin: "8px 0",
    }}>
      {block.content}
    </div>
  );
}

function ListBlockR({ block }: { block: { ordered: boolean; items: string[] } }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 15, lineHeight: 1.8 }}>
      {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
    </Tag>
  );
}

function TemplateBlockR({ block }: { block: { label?: string; content: string } }) {
  return (
    <div style={{ margin: "8px 0" }}>
      {block.label && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6c4fe0", marginBottom: 6 }}>
          {block.label}
        </div>
      )}
      <div style={{
        background: "#fafbff", border: "1px dashed #c7d2fe", borderRadius: 18,
        padding: 16, fontSize: 14, fontFamily: "monospace", whiteSpace: "pre-line",
        lineHeight: 1.9, display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ flex: 1 }}>{block.content}</span>
        <CopyButton text={block.content} />
      </div>
    </div>
  );
}

function QaPairBlockR({ block }: { block: { question: string; answer: string } }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{block.question}</div>
      <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>{block.answer}</p>
    </div>
  );
}

function BlocksR({ blocks }: { blocks: Block[] }) {
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
          case "accordion": return <AccordionBlockR key={i} block={block} />;
          case "qa_pair":   return <QaPairBlockR   key={i} block={block} />;
          default:          return null;
        }
      })}
    </>
  );
}

function BoxBlockR({ block }: { block: BoxBlock }) {
  const v = BOX_VARIANT[block.variant ?? "default"] ?? BOX_VARIANT.default;
  return (
    <div style={{
      border: `1px solid ${v.borderColor}`, borderRadius: 18, padding: 16,
      background: v.background,
    }}>
      {block.pill && <Pill text={block.pill.text} color={block.pill.color} />}
      {block.title && <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>{block.title}</h3>}
      <BlocksR blocks={block.blocks} />
    </div>
  );
}

function GridBlockR({ block }: { block: { cols: 2 | 3; items: BoxBlock[] } }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${block.cols}, minmax(0,1fr))`,
      gap: 16, margin: "8px 0",
    }}>
      {block.items.map((item, i) => <BoxBlockR key={i} block={item} />)}
    </div>
  );
}

function AccordionBlockR({ block }: { block: { title: string; time: string; blocks: Block[] } }) {
  return (
    <details open style={{
      border: "1px solid var(--line)", borderRadius: 18, background: "#fff", overflow: "hidden",
      marginBottom: 12,
    }}>
      <summary style={{
        listStyle: "none", cursor: "pointer", padding: "16px 18px",
        fontWeight: 700, fontSize: 15,
        background: "linear-gradient(180deg,#ffffff,#fbfcff)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{block.title}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: "#0f6fb8",
          background: "#e8f6ff", borderRadius: 999, padding: "4px 10px",
        }}>
          {block.time}
        </span>
      </summary>
      <div style={{ padding: "4px 18px 18px" }}>
        <BlocksR blocks={block.blocks} />
      </div>
    </details>
  );
}

// ── Section panel ─────────────────────────────────────────────────────────────
function SectionPanel({ section, index }: { section: Section; index: number }) {
  return (
    <section
      id={section.id}
      style={{
        background: "#fff", border: "1px solid var(--line)", borderRadius: 24,
        boxShadow: "0 10px 30px rgba(31,41,55,0.08)", overflow: "hidden", marginBottom: 18,
        scrollMarginTop: 20,
      }}
    >
      <div style={{
        padding: "18px 22px", borderBottom: "1px solid var(--line)",
        background: "linear-gradient(180deg,rgba(142,208,255,0.12),rgba(203,183,255,0.08))",
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {index + 1}. {section.title}
        </h2>
      </div>
      <div style={{ padding: 22 }}>
        <BlocksR blocks={section.blocks} />
      </div>
    </section>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection({ hero }: { hero: Hero }) {
  return (
    <div style={{
      background: "linear-gradient(135deg,rgba(142,208,255,0.9),rgba(203,183,255,0.92))",
      border: "1px solid rgba(255,255,255,0.55)", borderRadius: 28, padding: 28,
      color: "#fff", position: "relative", overflow: "hidden",
    }}>
      {/* decorative blobs */}
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.18)", filter: "blur(4px)", right: -40, top: -40 }} />
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.18)", filter: "blur(4px)", left: -20, bottom: -28 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {hero.tags.map(tag => (
            <span key={tag} style={{
              display: "inline-flex", alignItems: "center", padding: "7px 12px",
              borderRadius: 999, background: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.28)", fontSize: 13, fontWeight: 600,
            }}>
              {tag}
            </span>
          ))}
        </div>

        <h1 style={{ fontSize: 36, lineHeight: 1.15, fontWeight: 800, margin: "0 0 10px" }}>
          {hero.title}
        </h1>
        <p style={{ fontSize: 16, margin: "0 0 20px", maxWidth: 780, opacity: 0.96, lineHeight: 1.75 }}>
          {hero.subtitle}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>一句话目标</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{hero.goal}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>唯一核心成果</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{hero.outcome}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function LessonRenderer({ content }: { content: LessonContent }) {
  const tocSections = content.sections.map(s => ({ id: s.id, title: s.title }));

  return (
    <div style={{ padding: "28px 24px 64px", maxWidth: 1180, margin: "0 auto" }}>
      <HeroSection hero={content.hero} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 22,
        marginTop: 24,
        alignItems: "start",
      }}>
        {/* Sticky TOC */}
        <div style={{
          position: "sticky", top: 20,
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
          border: "1px solid var(--line)", boxShadow: "0 10px 30px rgba(31,41,55,0.07)",
          borderRadius: 22, padding: 18,
        }}>
          <LessonToc sections={tocSections} />
        </div>

        {/* Section panels */}
        <div>
          {content.sections.map((section, i) => (
            <SectionPanel key={section.id} section={section} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
