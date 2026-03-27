import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import type { SlideshowOutput, SlideshowTheme, Slide, SlideType } from "@/types/slideshow";

const IMAGES_DIR = process.env.AI_IMAGES_DIR
  ?? path.join(process.cwd(), "public", "ai-images");

/**
 * Build a .pptx Buffer from SlideshowOutput + theme config.
 */
export async function buildPptx(
  output: SlideshowOutput,
  theme: SlideshowTheme,
  meta: { courseTitle: string; lessonTitle: string; lessonNo: number },
): Promise<Buffer> {
  const pptx = new PptxGenJS();

  pptx.title = `${meta.courseTitle} - 第${meta.lessonNo}课 ${meta.lessonTitle}`;
  pptx.subject = meta.courseTitle;
  pptx.layout = "LAYOUT_16x9";

  for (const slide of output.slides) {
    const pptSlide = pptx.addSlide();
    applySlideContent(pptSlide, slide, theme);
  }

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}

// ── Slide renderers by type ──

function applySlideContent(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  // Background
  pptSlide.background = { color: theme.background.replace("#", "") };

  // Add speaker notes if present
  if (slide.notes) {
    pptSlide.addNotes(slide.notes);
  }

  const renderers: Record<SlideType, () => void> = {
    cover: () => renderCover(pptSlide, slide, theme),
    content: () => renderContent(pptSlide, slide, theme),
    interaction: () => renderInteraction(pptSlide, slide, theme),
    showcase: () => renderShowcase(pptSlide, slide, theme),
    ending: () => renderEnding(pptSlide, slide, theme),
  };

  const render = renderers[slide.type] ?? renderers.content;
  render();
}

function renderCover(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  // Background image (if available)
  if (slide.imageUrl) {
    addSlideImage(pptSlide, slide.imageUrl, { x: 0, y: 0, w: 10, h: 5.63 });
    // Semi-transparent overlay for text readability
    pptSlide.addShape("rect", {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: theme.background.replace("#", ""), transparency: 50 },
    });
  }

  // Accent bar at top
  pptSlide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: theme.accentColor.replace("#", "") },
  });

  // Title
  pptSlide.addText(slide.title, {
    x: 1, y: 1.8, w: 8, h: 1.2,
    fontSize: theme.titleFontSize + 8,
    fontFace: theme.titleFont,
    color: theme.titleColor.replace("#", ""),
    bold: true,
    align: "center",
    valign: "middle",
  });

  // Subtitle
  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 1, y: 3.2, w: 8, h: 0.8,
      fontSize: theme.bodyFontSize + 4,
      fontFace: theme.bodyFont,
      color: theme.bodyColor.replace("#", ""),
      align: "center",
      valign: "middle",
    });
  }

  // Bottom accent bar
  pptSlide.addShape("rect", {
    x: 0, y: 5.55, w: "100%", h: 0.08,
    fill: { color: theme.accentColor.replace("#", "") },
  });
}

function renderContent(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  const hasImage = !!slide.imageUrl;
  const contentWidth = hasImage ? 5.5 : 9;

  // Image on right (if present)
  if (hasImage) {
    addSlideImage(pptSlide, slide.imageUrl, { x: 6.2, y: 0.3, w: 3.5, h: 4.8 });
  }

  // Left accent bar
  pptSlide.addShape("rect", {
    x: 0, y: 0, w: 0.06, h: "100%",
    fill: { color: theme.accentColor.replace("#", "") },
  });

  // Title
  pptSlide.addText(slide.title, {
    x: 0.5, y: 0.3, w: contentWidth, h: 0.7,
    fontSize: theme.titleFontSize,
    fontFace: theme.titleFont,
    color: theme.titleColor.replace("#", ""),
    bold: true,
  });

  // Divider line
  pptSlide.addShape("rect", {
    x: 0.5, y: 1.05, w: 2, h: 0.03,
    fill: { color: theme.accentColor.replace("#", "") },
  });

  let yPos = 1.3;

  // Subtitle
  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.5, y: yPos, w: contentWidth, h: 0.5,
      fontSize: theme.bodyFontSize + 2,
      fontFace: theme.bodyFont,
      color: theme.accentColor.replace("#", ""),
      italic: true,
    });
    yPos += 0.6;
  }

  // Body text
  if (slide.body) {
    pptSlide.addText(slide.body, {
      x: 0.5, y: yPos, w: contentWidth, h: 2,
      fontSize: theme.bodyFontSize,
      fontFace: theme.bodyFont,
      color: theme.bodyColor.replace("#", ""),
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
    yPos += 2.2;
  }

  // Bullets
  if (slide.bullets && slide.bullets.length > 0) {
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: theme.bodyFontSize,
        fontFace: theme.bodyFont,
        color: theme.bodyColor.replace("#", ""),
        bullet: { code: "2022" as const },
        lineSpacingMultiple: 1.5,
      },
    }));
    pptSlide.addText(bulletTexts, {
      x: 0.5, y: yPos, w: contentWidth, h: 3,
      valign: "top",
    });
  }
}

function renderInteraction(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  // Image on right (if present)
  if (slide.imageUrl) {
    addSlideImage(pptSlide, slide.imageUrl, { x: 6.2, y: 1.5, w: 3.5, h: 3.5 });
  }

  // Accent background strip
  pptSlide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: 1.2,
    fill: { color: theme.accentColor.replace("#", "") },
  });

  // Title on accent strip
  pptSlide.addText(slide.title, {
    x: 0.5, y: 0.2, w: 9, h: 0.8,
    fontSize: theme.titleFontSize,
    fontFace: theme.titleFont,
    color: isLightColor(theme.accentColor) ? "333333" : "FFFFFF",
    bold: true,
  });

  const interactionContentWidth = slide.imageUrl ? 5.5 : 9;
  let yPos = 1.5;

  // Subtitle / task description
  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.5, y: yPos, w: interactionContentWidth, h: 0.5,
      fontSize: theme.bodyFontSize + 2,
      fontFace: theme.bodyFont,
      color: theme.titleColor.replace("#", ""),
      bold: true,
    });
    yPos += 0.7;
  }

  // Body — operation guide
  if (slide.body) {
    pptSlide.addText(slide.body, {
      x: 0.5, y: yPos, w: interactionContentWidth, h: 2.5,
      fontSize: theme.bodyFontSize,
      fontFace: theme.bodyFont,
      color: theme.bodyColor.replace("#", ""),
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }
}

function renderShowcase(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  // Image on right (if present)
  if (slide.imageUrl) {
    addSlideImage(pptSlide, slide.imageUrl, { x: 6.2, y: 1.2, w: 3.5, h: 3.8 });
  }

  // Title
  pptSlide.addText(slide.title, {
    x: 0.5, y: 0.5, w: 9, h: 0.7,
    fontSize: theme.titleFontSize,
    fontFace: theme.titleFont,
    color: theme.titleColor.replace("#", ""),
    bold: true,
    align: "center",
  });

  let yPos = 1.5;

  // Body
  if (slide.body) {
    pptSlide.addText(slide.body, {
      x: 1, y: yPos, w: 8, h: 1.5,
      fontSize: theme.bodyFontSize + 2,
      fontFace: theme.bodyFont,
      color: theme.bodyColor.replace("#", ""),
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
    yPos += 1.8;
  }

  // Bullets as showcase requirements
  if (slide.bullets && slide.bullets.length > 0) {
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: theme.bodyFontSize,
        fontFace: theme.bodyFont,
        color: theme.accentColor.replace("#", ""),
        bullet: { code: "2713" as const },
        lineSpacingMultiple: 1.5,
      },
    }));
    pptSlide.addText(bulletTexts, {
      x: 1.5, y: yPos, w: 7, h: 2,
      valign: "top",
    });
  }
}

function renderEnding(
  pptSlide: PptxGenJS.Slide,
  slide: Slide,
  theme: SlideshowTheme,
): void {
  // Background image (if available) — same treatment as cover
  if (slide.imageUrl) {
    addSlideImage(pptSlide, slide.imageUrl, { x: 0, y: 0, w: 10, h: 5.63 });
    pptSlide.addShape("rect", {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: theme.background.replace("#", ""), transparency: 50 },
    });
  }

  // Accent bar at bottom
  pptSlide.addShape("rect", {
    x: 0, y: 5.55, w: "100%", h: 0.08,
    fill: { color: theme.accentColor.replace("#", "") },
  });

  // Title
  pptSlide.addText(slide.title, {
    x: 1, y: 1.2, w: 8, h: 0.8,
    fontSize: theme.titleFontSize + 4,
    fontFace: theme.titleFont,
    color: theme.titleColor.replace("#", ""),
    bold: true,
    align: "center",
  });

  let yPos = 2.3;

  // Body — summary
  if (slide.body) {
    pptSlide.addText(slide.body, {
      x: 1, y: yPos, w: 8, h: 1,
      fontSize: theme.bodyFontSize + 2,
      fontFace: theme.bodyFont,
      color: theme.bodyColor.replace("#", ""),
      align: "center",
      valign: "top",
    });
    yPos += 1.2;
  }

  // Bullets — takeaways
  if (slide.bullets && slide.bullets.length > 0) {
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: theme.bodyFontSize,
        fontFace: theme.bodyFont,
        color: theme.bodyColor.replace("#", ""),
        bullet: { code: "2B50" as const },
        lineSpacingMultiple: 1.5,
      },
    }));
    pptSlide.addText(bulletTexts, {
      x: 2, y: yPos, w: 6, h: 2,
      valign: "top",
    });
  }
}

// ── Helpers ──

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

/**
 * Resolve a slide imageUrl to base64 data URI for pptxgenjs.
 * Handles /api/ai-images/... paths by reading from disk.
 * Returns null if image cannot be loaded.
 */
function resolveImageData(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  try {
    // /api/ai-images/slideshow/abc123.png → IMAGES_DIR/slideshow/abc123.png
    if (imageUrl.startsWith("/api/ai-images/")) {
      const relativePath = imageUrl.replace("/api/ai-images/", "");
      const filePath = path.join(IMAGES_DIR, relativePath);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).slice(1) || "png";
        return `data:image/${ext};base64,${buffer.toString("base64")}`;
      }
      return null;
    }

    // Already a data URI or HTTP URL — pass through
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      return imageUrl;
    }

    // Local file path
    if (fs.existsSync(imageUrl)) {
      const buffer = fs.readFileSync(imageUrl);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Add an image to a slide at the specified position.
 * Silently skips if image cannot be resolved.
 */
function addSlideImage(
  pptSlide: PptxGenJS.Slide,
  imageUrl: string | null | undefined,
  opts: { x: number; y: number; w: number; h: number },
): void {
  const data = resolveImageData(imageUrl);
  if (!data) return;

  pptSlide.addImage({
    data,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    sizing: { type: "cover", w: opts.w, h: opts.h },
  });
}
