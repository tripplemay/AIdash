/**
 * 课件生成（Slideshow）类型定义
 */

/** PPT 页面类型 */
export type SlideType = "cover" | "content" | "interaction" | "showcase" | "ending";

/** 单页幻灯片 */
export interface Slide {
  type: SlideType;
  layout: string;              // 版式 key，如 "cover_fullimage"
  title: string;
  subtitle?: string | null;
  body?: string | null;
  bullets?: string[] | null;
  imagePrompt?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
}

/** 版式组件定义（存储在 Preset.value JSON 中） */
export interface SlideshowLayout {
  label: string;
  themeKey: string;
  templateDir: string;
  type: string;
  slideIndex: number;
  placeholders: Record<string, string>;
  imageOrientation: "landscape" | "portrait" | "square" | null;
  description: string;
}

/** 生成进度 */
export interface SlideshowProgress {
  step: number;
  total: number;
  message: string;
}

/** AI 转写输出的完整结构 */
export interface SlideshowOutput {
  slides: Slide[];
}

/** PPT 主题配置（存储在 Preset.value JSON 中） */
export interface SlideshowTheme {
  description: string;
  background: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  titleFont: string;
  bodyFont: string;
  titleFontSize: number;
  bodyFontSize: number;
  layoutStyle: string;
}
