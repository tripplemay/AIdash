import fs from "node:fs";
import path from "node:path";
import Automizer, { modify, ModifyImageHelper, type ShapeModificationCallback } from "pptx-automizer";
import type { SlideshowOutput, SlideshowLayout } from "@/types/slideshow";
import { prisma } from "@/lib/prisma";

const TEMPLATES_DIR = path.join(process.cwd(), "templates", "slideshow");
const IMAGES_DIR = process.env.AI_IMAGES_DIR
  ?? path.join(process.cwd(), "public", "ai-images");

/**
 * Build a .pptx Buffer from SlideshowOutput using pptx-automizer templates.
 * Each slide's `layout` field maps to a template slide via the slideshow_layout Preset.
 */
export async function buildPptx(
  output: SlideshowOutput,
  themeKey: string,
  meta: { courseTitle: string; lessonTitle: string; lessonNo: number },
): Promise<Buffer> {
  // Resolve theme directory
  const themeDir = await resolveThemeDirForBuild(themeKey);
  const templatePath = path.join(TEMPLATES_DIR, themeDir, "template.pptx");
  const rootPath = path.join(TEMPLATES_DIR, "root.pptx");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`);
  }
  if (!fs.existsSync(rootPath)) {
    throw new Error(`根模板文件不存在: ${rootPath}`);
  }

  // Load layout definitions from DB
  const layoutPresets = await prisma.preset.findMany({
    where: {
      category: "slideshow_layout",
      isActive: true,
      name: { startsWith: `${themeDir}/` },
    },
  });

  const layoutMap = new Map<string, SlideshowLayout>();
  for (const p of layoutPresets) {
    const layoutKey = p.name.split("/")[1];
    try {
      layoutMap.set(layoutKey, JSON.parse(p.value));
    } catch { /* skip invalid */ }
  }

  // Collect image files needed
  const imageFiles: string[] = [];
  for (const slide of output.slides) {
    if (slide.imageUrl) {
      const resolved = resolveImagePath(slide.imageUrl);
      if (resolved) imageFiles.push(resolved);
    }
  }

  // Initialize automizer
  const automizer = new Automizer({
    templateDir: TEMPLATES_DIR,
    removeExistingSlides: true,
    autoImportSlideMasters: true,
    compression: 6,
  });

  const pres = automizer
    .loadRoot(rootPath)
    .load(templatePath, "tpl");

  // Load media files
  if (imageFiles.length > 0) {
    for (const imgPath of imageFiles) {
      pres.loadMedia(path.basename(imgPath), path.dirname(imgPath));
    }
  }

  // Add slides
  for (const slide of output.slides) {
    const layout = layoutMap.get(slide.layout);
    if (!layout) {
      // Fallback: try to find any layout matching the slide type
      const fallback = findFallbackLayout(slide.type, layoutMap);
      if (!fallback) continue; // Skip slide if no layout found
      addSlideFromLayout(pres, slide, fallback);
    } else {
      addSlideFromLayout(pres, slide, layout);
    }
  }

  // Write to buffer
  const jszip = await pres.getJSZip();
  const buffer = await jszip.generateAsync({ type: "nodebuffer" });
  return buffer as Buffer;
}

function addSlideFromLayout(
  pres: ReturnType<typeof Automizer.prototype.loadRoot>,
  slide: { title: string; subtitle?: string | null; body?: string | null; bullets?: string[] | null; imageUrl?: string | null; notes?: string | null },
  layout: SlideshowLayout,
): void {
  pres.addSlide("tpl", layout.slideIndex, (s) => {
    // Replace title
    if (layout.placeholders.title) {
      s.modifyElement(layout.placeholders.title, [
        modify.replaceText([{ replace: "title", by: { text: slide.title } }]),
      ]);
    }

    // Replace subtitle
    if (layout.placeholders.subtitle && slide.subtitle) {
      s.modifyElement(layout.placeholders.subtitle, [
        modify.replaceText([{ replace: "subtitle", by: { text: slide.subtitle } }]),
      ]);
    }

    // Replace body — combine body text and bullets
    if (layout.placeholders.body) {
      const bodyContent = formatBodyContent(slide.body, slide.bullets);
      if (bodyContent) {
        s.modifyElement(layout.placeholders.body, [
          modify.replaceText([{ replace: "body", by: { text: bodyContent } }]),
        ]);
      }
    }

    // Replace image
    if (layout.placeholders.image && slide.imageUrl) {
      const imgPath = resolveImagePath(slide.imageUrl);
      if (imgPath) {
        s.modifyElement(layout.placeholders.image, [
          ModifyImageHelper.setRelationTarget(path.basename(imgPath)) as unknown as ShapeModificationCallback,
        ]);
      }
    }
  });
}

function formatBodyContent(
  body: string | null | undefined,
  bullets: string[] | null | undefined,
): string {
  const parts: string[] = [];
  if (body) parts.push(body);
  if (bullets && bullets.length > 0) {
    parts.push(bullets.map((b) => `• ${b}`).join("\n"));
  }
  return parts.join("\n\n");
}

function findFallbackLayout(
  type: string,
  layoutMap: Map<string, SlideshowLayout>,
): SlideshowLayout | null {
  for (const layout of layoutMap.values()) {
    if (layout.type === type) return layout;
  }
  // Last resort: use first available layout
  const first = layoutMap.values().next();
  return first.done ? null : first.value;
}

/**
 * Resolve a slide imageUrl to a local file path.
 * Returns null if not found.
 */
function resolveImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  // /api/ai-images/slideshow/abc123.png → IMAGES_DIR/slideshow/abc123.png
  if (imageUrl.startsWith("/api/ai-images/")) {
    const relativePath = imageUrl.replace("/api/ai-images/", "");
    const filePath = path.join(IMAGES_DIR, relativePath);
    return fs.existsSync(filePath) ? filePath : null;
  }

  // Absolute path
  if (fs.existsSync(imageUrl)) return imageUrl;

  return null;
}

async function resolveThemeDirForBuild(themeKey: string): Promise<string> {
  const preset = await prisma.preset.findUnique({
    where: { category_name: { category: "slideshow_theme", name: themeKey } },
  });
  if (preset) {
    try {
      const val = JSON.parse(preset.value);
      if (val.templateDir) return val.templateDir;
    } catch { /* ignore */ }
  }
  return themeKey.toLowerCase().replace(/\s+/g, "-");
}
