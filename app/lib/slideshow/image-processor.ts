import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { saveAiImage } from "@/lib/ai/image-store";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import type { Slide, SlideshowLayout } from "@/types/slideshow";

const IMAGE_ACTION_KEY = "slideshow_image";

/** Image sizes by orientation */
const IMAGE_SIZES: Record<string, string> = {
  landscape: "1792x1024",
  portrait: "1024x1536",
  square: "1024x1024",
};

interface ImageContext {
  heroImageUrl?: string | null;
  ageRange?: string | null;
  imageStylePrompt?: string | null;
  userId: string;
  layoutMap: Map<string, SlideshowLayout>;
}

/**
 * Process images for all slides.
 * - Cover: reuse hero image or generate
 * - Ending: reuse cover image
 * - Middle slides: AI-generate if imagePrompt present
 * Image size is determined by the layout's imageOrientation.
 * Returns updated slides with imageUrl filled in.
 */
export async function processSlideImages(
  slides: Slide[],
  context: ImageContext,
  onProgress: (step: number, total: number, message: string) => Promise<void>,
): Promise<Slide[]> {
  // Count slides needing image processing
  const imageTasks = slides
    .map((s, i) => ({ slide: s, index: i }))
    .filter(({ slide }) => slide.imagePrompt);

  const totalSteps = imageTasks.length;
  if (totalSteps === 0) return slides;

  // Try to get image provider (optional — if not configured, skip images)
  const imageConfig = await getProviderAndModel(IMAGE_ACTION_KEY).catch(() => null);
  if (!imageConfig?.provider?.generateImage) {
    return slides;
  }

  const updatedSlides = [...slides];
  let coverImageUrl: string | null = null;

  for (let i = 0; i < imageTasks.length; i++) {
    const { slide, index } = imageTasks[i];
    const stepNum = i + 1;

    await onProgress(stepNum, totalSteps, `正在生成第 ${index + 1} 页图片 (${stepNum}/${totalSteps})...`);

    // Determine image size from layout orientation
    const layout = context.layoutMap.get(slide.layout);
    const orientation = layout?.imageOrientation ?? "landscape";
    const size = IMAGE_SIZES[orientation] ?? IMAGE_SIZES.landscape;

    try {
      let imageUrl: string | null = null;

      if (slide.type === "cover") {
        // Cover: reuse hero image if available
        imageUrl = context.heroImageUrl
          ? context.heroImageUrl
          : await generateAndSaveImage(imageConfig, slide.imagePrompt!, context, size);
        coverImageUrl = imageUrl;
      } else if (slide.type === "ending") {
        // Ending: reuse cover image
        imageUrl = coverImageUrl;
        if (!imageUrl && slide.imagePrompt) {
          imageUrl = await generateAndSaveImage(imageConfig, slide.imagePrompt, context, size);
        }
      } else {
        // Middle slides: AI generate
        imageUrl = await generateAndSaveImage(imageConfig, slide.imagePrompt!, context, size);
      }

      if (imageUrl) {
        updatedSlides[index] = { ...slide, imageUrl };
      }
    } catch {
      // Image failure does not block main flow — slide remains without image
    }
  }

  return updatedSlides;
}

async function generateAndSaveImage(
  imageConfig: { provider: { generateImage?: (params: { prompt: string; model: string; size?: string }) => Promise<{ url: string; model: string }> }; model: string },
  imagePrompt: string,
  context: ImageContext,
  size: string,
): Promise<string> {
  const ageHint = context.ageRange ? `Designed for ${context.ageRange} age group. ` : "";
  const stylePrefix = context.imageStylePrompt ? `Style: ${context.imageStylePrompt}. ` : "";
  const finalPrompt = ageHint + stylePrefix + imagePrompt;

  const img = await imageConfig.provider.generateImage!({
    prompt: finalPrompt,
    model: imageConfig.model,
    size,
  });

  const imageUrl = await saveAiImage(img.url, "slideshow");

  // Log cost
  const cost = await calculateCallCostFromDb(IMAGE_ACTION_KEY, 0, 0);
  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: null,
      pageKey: "slideshow",
      actionType: IMAGE_ACTION_KEY,
      modelName: img.model,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: cost,
      userId: context.userId,
      promptLog: finalPrompt,
      messageLog: null,
    },
  });

  return imageUrl;
}
