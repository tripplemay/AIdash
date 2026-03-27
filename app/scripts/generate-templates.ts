/**
 * 生成课件版式模板 .pptx 文件
 *
 * 每套主题包含 8 种版式页面，占位符通过形状名称标识。
 * 生产环境可用 SlidesCarnival 模板替换这些文件，保持 manifest.json 的 slideIndex 和形状名称一致。
 *
 * 运行：npx tsx scripts/generate-templates.ts
 */

import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";

interface ThemeConfig {
  name: string;
  dir: string;
  bg: string;
  bgGrad1: string;
  bgGrad2: string;
  titleColor: string;
  bodyColor: string;
  accent: string;
  accentLight: string;
}

const THEMES: ThemeConfig[] = [
  {
    name: "科技蓝",
    dir: "tech-blue",
    bg: "0F1B2D",
    bgGrad1: "0F1B2D",
    bgGrad2: "1A2744",
    titleColor: "7CB3FF",
    bodyColor: "E0E8F0",
    accent: "5B8DEF",
    accentLight: "3D5A9E",
  },
  {
    name: "自然绿",
    dir: "nature-green",
    bg: "F5FAF0",
    bgGrad1: "E8F5E0",
    bgGrad2: "F5FAF0",
    titleColor: "2D6A4F",
    bodyColor: "344E41",
    accent: "52B788",
    accentLight: "D4EDDA",
  },
  {
    name: "创意橙",
    dir: "creative-orange",
    bg: "FFF8F0",
    bgGrad1: "FFF0E0",
    bgGrad2: "FFF8F0",
    titleColor: "E85D04",
    bodyColor: "4A3728",
    accent: "F48C06",
    accentLight: "FFE0B2",
  },
  {
    name: "简约白",
    dir: "minimal-white",
    bg: "FFFFFF",
    bgGrad1: "F8F9FA",
    bgGrad2: "FFFFFF",
    titleColor: "1A1A2E",
    bodyColor: "333333",
    accent: "4361EE",
    accentLight: "E8EDFF",
  },
];

// 每套模板的 8 种版式
function buildTemplate(theme: ThemeConfig): void {
  const pptx = new PptxGenJS();
  pptx.title = `${theme.name} 课件模板`;
  pptx.layout = "LAYOUT_16x9";

  // ── Slide 1: cover_fullimage ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bg };
    // Image placeholder area (will be replaced by pptx-automizer)
    s.addShape("roundRect", { objectName: "BackgroundImage", x: 0, y: 0, w: 10, h: 5.63, rectRadius: 0, fill: { color: theme.accentLight, transparency: 80 } });
    // Decorative accent line
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: theme.accent } });
    s.addShape("rect", { x: 0, y: 5.57, w: "100%", h: 0.06, fill: { color: theme.accent } });
    // Title
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 1, y: 1.6, w: 8, h: 1.4, fontSize: 44, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true, align: "center", valign: "middle" });
    // Subtitle
    s.addText("{{subtitle}}", { shape: "rect", objectName: "SubtitleShape", x: 1.5, y: 3.2, w: 7, h: 0.8, fontSize: 22, fontFace: "Microsoft YaHei", color: theme.bodyColor, align: "center", valign: "middle" });
  }

  // ── Slide 2: cover_gradient ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad1 };
    // Decorative circles
    s.addShape("ellipse", { x: -1, y: -1, w: 3, h: 3, fill: { color: theme.accentLight, transparency: 60 } });
    s.addShape("ellipse", { x: 8, y: 3.5, w: 2.5, h: 2.5, fill: { color: theme.accent, transparency: 70 } });
    s.addShape("rect", { x: 0.5, y: 5.2, w: 9, h: 0.04, fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.8, y: 1.5, w: 8.4, h: 1.4, fontSize: 44, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true, align: "center", valign: "middle" });
    s.addText("{{subtitle}}", { shape: "rect", objectName: "SubtitleShape", x: 1.5, y: 3.2, w: 7, h: 0.8, fontSize: 22, fontFace: "Microsoft YaHei", color: theme.bodyColor, align: "center", valign: "middle" });
  }

  // ── Slide 3: content_text_only ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad2 };
    s.addShape("rect", { x: 0, y: 0, w: 0.05, h: "100%", fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 30, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true });
    s.addShape("rect", { x: 0.5, y: 1.15, w: 2, h: 0.04, fill: { color: theme.accent } });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 0.5, y: 1.4, w: 9, h: 3.8, fontSize: 18, fontFace: "Microsoft YaHei", color: theme.bodyColor, valign: "top", lineSpacingMultiple: 1.4 });
  }

  // ── Slide 4: content_image_right ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad2 };
    s.addShape("rect", { x: 0, y: 0, w: 0.05, h: "100%", fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.5, y: 0.3, w: 5.5, h: 0.8, fontSize: 30, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true });
    s.addShape("rect", { x: 0.5, y: 1.15, w: 2, h: 0.04, fill: { color: theme.accent } });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 0.5, y: 1.4, w: 5.2, h: 3.8, fontSize: 18, fontFace: "Microsoft YaHei", color: theme.bodyColor, valign: "top", lineSpacingMultiple: 1.4 });
    // Image placeholder (right side, portrait orientation)
    s.addShape("roundRect", { objectName: "ImageShape", x: 6.2, y: 0.4, w: 3.4, h: 4.8, rectRadius: 0.15, fill: { color: theme.accentLight, transparency: 50 } });
  }

  // ── Slide 5: content_image_bottom ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad2 };
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.05, fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.5, y: 0.2, w: 9, h: 0.7, fontSize: 28, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 0.5, y: 1.0, w: 9, h: 1.5, fontSize: 16, fontFace: "Microsoft YaHei", color: theme.bodyColor, valign: "top", lineSpacingMultiple: 1.3 });
    // Image placeholder (bottom, landscape orientation)
    s.addShape("roundRect", { objectName: "ImageShape", x: 0.5, y: 2.7, w: 9, h: 2.7, rectRadius: 0.15, fill: { color: theme.accentLight, transparency: 50 } });
  }

  // ── Slide 6: interaction_card ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad2 };
    // Accent header
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: 1.2, fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.5, y: 0.2, w: 9, h: 0.8, fontSize: 30, fontFace: "Microsoft YaHei", color: "FFFFFF", bold: true });
    // Card-style body
    s.addShape("roundRect", { x: 0.8, y: 1.6, w: 8.4, h: 3.5, rectRadius: 0.2, fill: { color: theme.bg }, shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.15 } });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 1.2, y: 1.9, w: 7.6, h: 2.9, fontSize: 18, fontFace: "Microsoft YaHei", color: theme.bodyColor, valign: "top", lineSpacingMultiple: 1.4 });
  }

  // ── Slide 7: showcase_centered ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bgGrad2 };
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 30, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true, align: "center" });
    s.addShape("rect", { x: 4, y: 1.25, w: 2, h: 0.04, fill: { color: theme.accent } });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 1, y: 1.5, w: 8, h: 1.2, fontSize: 18, fontFace: "Microsoft YaHei", color: theme.bodyColor, align: "center", valign: "top" });
    // Image placeholder (center, landscape)
    s.addShape("roundRect", { objectName: "ImageShape", x: 1.5, y: 3, w: 7, h: 2.3, rectRadius: 0.15, fill: { color: theme.accentLight, transparency: 50 } });
  }

  // ── Slide 8: ending_summary ──
  {
    const s = pptx.addSlide();
    s.background = { color: theme.bg };
    // Decorative elements
    s.addShape("ellipse", { x: 7.5, y: -0.5, w: 3.5, h: 3.5, fill: { color: theme.accentLight, transparency: 60 } });
    s.addShape("ellipse", { x: -1, y: 3.5, w: 3, h: 3, fill: { color: theme.accent, transparency: 70 } });
    s.addShape("rect", { x: 0, y: 5.57, w: "100%", h: 0.06, fill: { color: theme.accent } });
    s.addText("{{title}}", { shape: "rect", objectName: "TitleShape", x: 1, y: 1.2, w: 8, h: 1, fontSize: 40, fontFace: "Microsoft YaHei", color: theme.titleColor, bold: true, align: "center", valign: "middle" });
    s.addText("{{body}}", { shape: "rect", objectName: "BodyShape", x: 1.5, y: 2.5, w: 7, h: 2.5, fontSize: 20, fontFace: "Microsoft YaHei", color: theme.bodyColor, align: "center", valign: "top", lineSpacingMultiple: 1.5 });
  }

  // Write
  const outDir = path.join(__dirname, "..", "templates", "slideshow", theme.dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "template.pptx");

  pptx.writeFile({ fileName: outPath }).then(() => {
    console.log(`  ✅ ${theme.name} → ${outPath}`);
  });
}

// Generate manifest.json for each theme
function writeManifest(theme: ThemeConfig): void {
  const manifest = {
    name: theme.name,
    source: "Auto-generated (replace with SlidesCarnival template)",
    license: "CC-BY-4.0",
    layouts: {
      cover_fullimage: {
        slideIndex: 1,
        description: "全屏背景图 + 半透明遮罩 + 居中大标题",
        type: "cover",
        placeholders: { title: "TitleShape", subtitle: "SubtitleShape", image: "BackgroundImage" },
        imageOrientation: "landscape",
      },
      cover_gradient: {
        slideIndex: 2,
        description: "渐变背景 + 装饰圆形 + 居中标题",
        type: "cover",
        placeholders: { title: "TitleShape", subtitle: "SubtitleShape" },
        imageOrientation: null,
      },
      content_text_only: {
        slideIndex: 3,
        description: "左侧强调线 + 标题 + 正文/要点列表",
        type: "content",
        placeholders: { title: "TitleShape", body: "BodyShape" },
        imageOrientation: null,
      },
      content_image_right: {
        slideIndex: 4,
        description: "左侧文字 + 右侧竖向图片",
        type: "content",
        placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" },
        imageOrientation: "portrait",
      },
      content_image_bottom: {
        slideIndex: 5,
        description: "上方标题/正文 + 下方横向图片",
        type: "content",
        placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" },
        imageOrientation: "landscape",
      },
      interaction_card: {
        slideIndex: 6,
        description: "强调色标题栏 + 卡片式内容区",
        type: "interaction",
        placeholders: { title: "TitleShape", body: "BodyShape" },
        imageOrientation: null,
      },
      showcase_centered: {
        slideIndex: 7,
        description: "居中标题 + 正文 + 横向图片展示区",
        type: "showcase",
        placeholders: { title: "TitleShape", body: "BodyShape", image: "ImageShape" },
        imageOrientation: "landscape",
      },
      ending_summary: {
        slideIndex: 8,
        description: "装饰背景 + 居中大标题 + 总结文字",
        type: "ending",
        placeholders: { title: "TitleShape", body: "BodyShape" },
        imageOrientation: null,
      },
    },
  };

  const outDir = path.join(__dirname, "..", "templates", "slideshow", theme.dir);
  const outPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`  📄 ${theme.name} manifest → ${outPath}`);
}

// Also generate a root.pptx (empty base template)
function buildRoot(): void {
  const pptx = new PptxGenJS();
  pptx.title = "AI Dash 课件根模板";
  pptx.layout = "LAYOUT_16x9";
  // Add one blank slide (will be removed by automizer)
  pptx.addSlide();

  const outPath = path.join(__dirname, "..", "templates", "slideshow", "root.pptx");
  pptx.writeFile({ fileName: outPath }).then(() => {
    console.log("  ✅ root.pptx generated");
  });
}

console.log("Generating slideshow templates...");
buildRoot();
for (const theme of THEMES) {
  buildTemplate(theme);
  writeManifest(theme);
}
console.log("Done! Templates are in app/templates/slideshow/");
console.log("Note: Replace template.pptx files with SlidesCarnival downloads for production quality.");
