/**
 * 课件生成（Slideshow）类型定义
 */

/** PPT 页面类型 */
export type SlideType = "cover" | "content" | "interaction" | "showcase" | "ending";

/** 单页幻灯片 */
export interface Slide {
  type: SlideType;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  bullets?: string[] | null;
  imagePrompt?: string | null;
  notes?: string | null;
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
