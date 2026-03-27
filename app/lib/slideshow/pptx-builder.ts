import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import type { SlideshowOutput, SlideshowLayout, Slide } from "@/types/slideshow";
import { prisma } from "@/lib/prisma";

const IMAGES_DIR = process.env.AI_IMAGES_DIR
  ?? path.join(process.cwd(), "public", "ai-images");

/**
 * Build a .pptx Buffer from SlideshowOutput.
 * Uses PptxGenJS with layout-aware rendering. Each slide's layout
 * determines the visual arrangement (image position, text area).
 */
export async function buildPptx(
  output: SlideshowOutput,
  themeKey: string,
  meta: { courseTitle: string; lessonTitle: string; lessonNo: number },
): Promise<Buffer> {
  // Load theme config
  const themePreset = await prisma.preset.findUnique({
    where: { category_name: { category: "slideshow_theme", name: themeKey } },
  });
  if (!themePreset) throw new Error(`主题「${themeKey}」不存在`);

  let theme: ThemeConfig;
  try {
    theme = JSON.parse(themePreset.value);
  } catch {
    throw new Error("主题配置格式错误");
  }

  // Load layout definitions
  const themeDir = theme.templateDir ?? themeKey.toLowerCase().replace(/\s+/g, "-");
  const layoutPresets = await prisma.preset.findMany({
    where: { category: "slideshow_layout", isActive: true, name: { startsWith: `${themeDir}/` } },
  });
  const layoutMap = new Map<string, SlideshowLayout>();
  for (const p of layoutPresets) {
    try { layoutMap.set(p.name.split("/")[1], JSON.parse(p.value)); } catch { /* skip */ }
  }

  const pptx = new PptxGenJS();
  pptx.title = `${meta.courseTitle} - 第${meta.lessonNo}课 ${meta.lessonTitle}`;
  pptx.subject = meta.courseTitle;
  pptx.layout = "LAYOUT_16x9";

  for (const slide of output.slides) {
    const layout = layoutMap.get(slide.layout) ?? findFallbackLayout(slide.type, layoutMap);
    const pptSlide = pptx.addSlide();
    renderSlide(pptSlide, slide, layout, theme);
  }

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}

// ── Theme config ──

interface ThemeConfig {
  background: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  titleFont: string;
  bodyFont: string;
  titleFontSize: number;
  bodyFontSize: number;
  templateDir?: string;
}

// ── Main slide renderer ──

function renderSlide(
  s: PptxGenJS.Slide,
  slide: Slide,
  layout: SlideshowLayout | null,
  theme: ThemeConfig,
): void {
  const bg = theme.background.replace("#", "");
  const title = theme.titleColor.replace("#", "");
  const body = theme.bodyColor.replace("#", "");
  const accent = theme.accentColor.replace("#", "");
  const accentLight = lightenColor(accent, 0.85);
  const imageData = resolveImageData(slide.imageUrl);
  const layoutKey = slide.layout ?? "";

  s.background = { color: bg };

  // Add speaker notes
  if (slide.notes) s.addNotes(slide.notes);

  // Route to layout-specific renderer
  if (slide.type === "cover") {
    renderCover(s, slide, theme, imageData);
  } else if (slide.type === "ending") {
    renderEnding(s, slide, theme, imageData);
  } else if (layoutKey.includes("image_right")) {
    renderContentImageRight(s, slide, theme, imageData);
  } else if (layoutKey.includes("image_bottom")) {
    renderContentImageBottom(s, slide, theme, imageData);
  } else if (layoutKey.includes("showcase")) {
    renderShowcase(s, slide, theme, imageData);
  } else if (layoutKey.includes("interaction") || layoutKey.includes("card")) {
    renderInteraction(s, slide, theme, accentLight);
  } else {
    renderContentTextOnly(s, slide, theme);
  }
}

// ── Layout renderers ──

function renderCover(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, imageData: string | null): void {
  const bg = t.background.replace("#", "");
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");

  if (imageData) {
    s.addImage({ data: imageData, x: 0, y: 0, w: 10, h: 5.63, sizing: { type: "cover", w: 10, h: 5.63 } });
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: bg, transparency: 45 } });
  }
  s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: accent } });
  s.addShape("rect", { x: 0, y: 5.57, w: "100%", h: 0.06, fill: { color: accent } });
  s.addText(slide.title, { x: 0.8, y: 1.6, w: 8.4, h: 1.4, fontSize: t.titleFontSize + 8, fontFace: t.titleFont, color: titleC, bold: true, align: "center", valign: "middle" });
  if (slide.subtitle) {
    s.addText(slide.subtitle, { x: 1.5, y: 3.2, w: 7, h: 0.8, fontSize: t.bodyFontSize + 4, fontFace: t.bodyFont, color: bodyC, align: "center", valign: "middle" });
  }
}

function renderEnding(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, imageData: string | null): void {
  const bg = t.background.replace("#", "");
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");

  if (imageData) {
    s.addImage({ data: imageData, x: 0, y: 0, w: 10, h: 5.63, sizing: { type: "cover", w: 10, h: 5.63 } });
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: bg, transparency: 45 } });
  }
  s.addShape("rect", { x: 0, y: 5.57, w: "100%", h: 0.06, fill: { color: accent } });
  s.addText(slide.title, { x: 1, y: 1.2, w: 8, h: 1, fontSize: t.titleFontSize + 4, fontFace: t.titleFont, color: titleC, bold: true, align: "center" });
  if (slide.body) {
    s.addText(slide.body, { x: 1.5, y: 2.5, w: 7, h: 1, fontSize: t.bodyFontSize + 2, fontFace: t.bodyFont, color: bodyC, align: "center", valign: "top" });
  }
  if (slide.bullets?.length) {
    const bulletY = slide.body ? 3.7 : 2.8;
    addBullets(s, slide.bullets, { x: 2, y: bulletY, w: 6, h: 1.5 }, t, "2B50");
  }
}

function renderContentTextOnly(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig): void {
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");

  s.addShape("rect", { x: 0, y: 0, w: 0.05, h: "100%", fill: { color: accent } });
  s.addText(slide.title, { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: t.titleFontSize, fontFace: t.titleFont, color: titleC, bold: true });
  s.addShape("rect", { x: 0.5, y: 1.05, w: 2, h: 0.04, fill: { color: accent } });

  let y = 1.3;
  if (slide.subtitle) {
    s.addText(slide.subtitle, { x: 0.5, y, w: 9, h: 0.5, fontSize: t.bodyFontSize + 2, fontFace: t.bodyFont, color: accent, italic: true });
    y += 0.6;
  }
  if (slide.body) {
    s.addText(slide.body, { x: 0.5, y, w: 9, h: 2, fontSize: t.bodyFontSize, fontFace: t.bodyFont, color: bodyC, valign: "top", lineSpacingMultiple: 1.4 });
    y += 2.2;
  }
  if (slide.bullets?.length) {
    addBullets(s, slide.bullets, { x: 0.5, y, w: 9, h: 3 }, t);
  }
}

function renderContentImageRight(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, imageData: string | null): void {
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");
  const textW = imageData ? 5.2 : 9;

  s.addShape("rect", { x: 0, y: 0, w: 0.05, h: "100%", fill: { color: accent } });
  s.addText(slide.title, { x: 0.5, y: 0.3, w: textW, h: 0.7, fontSize: t.titleFontSize, fontFace: t.titleFont, color: titleC, bold: true });
  s.addShape("rect", { x: 0.5, y: 1.05, w: 2, h: 0.04, fill: { color: accent } });

  let y = 1.3;
  if (slide.body) {
    s.addText(slide.body, { x: 0.5, y, w: textW, h: 2, fontSize: t.bodyFontSize, fontFace: t.bodyFont, color: bodyC, valign: "top", lineSpacingMultiple: 1.4 });
    y += 2.2;
  }
  if (slide.bullets?.length) {
    addBullets(s, slide.bullets, { x: 0.5, y, w: textW, h: 2.5 }, t);
  }
  if (imageData) {
    s.addImage({ data: imageData, x: 6, y: 0.4, w: 3.7, h: 4.8, sizing: { type: "cover", w: 3.7, h: 4.8 }, rounding: true });
  }
}

function renderContentImageBottom(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, imageData: string | null): void {
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");

  s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.05, fill: { color: accent } });
  s.addText(slide.title, { x: 0.5, y: 0.2, w: 9, h: 0.7, fontSize: t.titleFontSize - 2, fontFace: t.titleFont, color: titleC, bold: true });

  if (slide.body) {
    s.addText(slide.body, { x: 0.5, y: 1.0, w: 9, h: 1.2, fontSize: t.bodyFontSize, fontFace: t.bodyFont, color: bodyC, valign: "top", lineSpacingMultiple: 1.3 });
  }
  if (imageData) {
    s.addImage({ data: imageData, x: 0.5, y: 2.5, w: 9, h: 2.8, sizing: { type: "cover", w: 9, h: 2.8 }, rounding: true });
  }
}

function renderInteraction(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, accentLight: string): void {
  const accent = t.accentColor.replace("#", "");
  // Card text colors: auto-detect based on card background brightness
  const cardTitleC = isLightColor(accentLight) ? "1A1A2E" : "FFFFFF";
  const cardBodyC = isLightColor(accentLight) ? "333333" : "E0E8F0";

  s.addShape("rect", { x: 0, y: 0, w: "100%", h: 1.2, fill: { color: accent } });
  s.addText(slide.title, { x: 0.5, y: 0.2, w: 9, h: 0.8, fontSize: t.titleFontSize, fontFace: t.titleFont, color: isLightColor(accent) ? "333333" : "FFFFFF", bold: true });
  // Card
  s.addShape("roundRect", { x: 0.8, y: 1.5, w: 8.4, h: 3.6, rectRadius: 0.2, fill: { color: accentLight }, shadow: { type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.1 } });

  let y = 1.8;
  if (slide.subtitle) {
    s.addText(slide.subtitle, { x: 1.2, y, w: 7.6, h: 0.5, fontSize: t.bodyFontSize + 2, fontFace: t.bodyFont, color: cardTitleC, bold: true });
    y += 0.6;
  }
  if (slide.body) {
    s.addText(slide.body, { x: 1.2, y, w: 7.6, h: 2.2, fontSize: t.bodyFontSize, fontFace: t.bodyFont, color: cardBodyC, valign: "top", lineSpacingMultiple: 1.4 });
    y += 2.3;
  }
  if (slide.bullets?.length) {
    addBullets(s, slide.bullets, { x: 1.2, y, w: 7.6, h: 1.5 }, { ...t, bodyColor: `#${cardBodyC}` });
  }
}

function renderShowcase(s: PptxGenJS.Slide, slide: Slide, t: ThemeConfig, imageData: string | null): void {
  const accent = t.accentColor.replace("#", "");
  const titleC = t.titleColor.replace("#", "");
  const bodyC = t.bodyColor.replace("#", "");

  s.addText(slide.title, { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: t.titleFontSize, fontFace: t.titleFont, color: titleC, bold: true, align: "center" });
  s.addShape("rect", { x: 4, y: 1.15, w: 2, h: 0.04, fill: { color: accent } });

  if (slide.body) {
    s.addText(slide.body, { x: 1, y: 1.4, w: 8, h: 0.8, fontSize: t.bodyFontSize + 2, fontFace: t.bodyFont, color: bodyC, align: "center", valign: "top" });
  }
  if (imageData) {
    s.addImage({ data: imageData, x: 1.5, y: 2.5, w: 7, h: 2.8, sizing: { type: "cover", w: 7, h: 2.8 }, rounding: true });
  }
  if (slide.bullets?.length) {
    const bulletY = imageData ? 5.0 : 2.5;
    addBullets(s, slide.bullets, { x: 1.5, y: bulletY, w: 7, h: 1.5 }, t, "2713");
  }
}

// ── Helpers ──

function addBullets(
  s: PptxGenJS.Slide,
  bullets: string[],
  pos: { x: number; y: number; w: number; h: number },
  t: ThemeConfig,
  bulletCode = "2022",
): void {
  const items = bullets.map((b) => ({
    text: b,
    options: {
      fontSize: t.bodyFontSize,
      fontFace: t.bodyFont,
      color: t.bodyColor.replace("#", ""),
      bullet: { code: bulletCode as "2022" },
      lineSpacingMultiple: 1.5,
    },
  }));
  s.addText(items, { x: pos.x, y: pos.y, w: pos.w, h: pos.h, valign: "top" as const });
}

function resolveImageData(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith("/api/ai-images/")) {
      const rel = imageUrl.replace("/api/ai-images/", "");
      const fp = path.join(IMAGES_DIR, rel);
      if (fs.existsSync(fp)) {
        const buf = fs.readFileSync(fp);
        const ext = path.extname(fp).slice(1) || "png";
        return `data:image/${ext};base64,${buf.toString("base64")}`;
      }
      return null;
    }
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) return imageUrl;
    if (fs.existsSync(imageUrl)) {
      const buf = fs.readFileSync(imageUrl);
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
    return null;
  } catch { return null; }
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function lightenColor(hex: string, factor: number): string {
  const c = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(c.substring(0, 2), 16) + (255 - parseInt(c.substring(0, 2), 16)) * factor));
  const g = Math.min(255, Math.round(parseInt(c.substring(2, 4), 16) + (255 - parseInt(c.substring(2, 4), 16)) * factor));
  const b = Math.min(255, Math.round(parseInt(c.substring(4, 6), 16) + (255 - parseInt(c.substring(4, 6), 16)) * factor));
  return `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function findFallbackLayout(type: string, layoutMap: Map<string, SlideshowLayout>): SlideshowLayout | null {
  for (const layout of layoutMap.values()) {
    if (layout.type === type) return layout;
  }
  return null;
}
