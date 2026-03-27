import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { resolveTemplate, type TemplateContext } from "@/lib/ai/template-engine";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { processSlideImages } from "./image-processor";
import type { SlideshowOutput, SlideshowProgress } from "@/types/slideshow";

const ACTION_KEY = "generate_slideshow";

export interface GenerateSlideshowParams {
  lessonId: string;
  userId: string;
  themeKey: string;
}

/**
 * Trigger slideshow generation: create/update draft as "generating", then
 * kick off async execution. Returns immediately with draftId.
 */
export async function triggerGeneration(
  params: GenerateSlideshowParams,
): Promise<{ draftId: string }> {
  const { lessonId, userId, themeKey } = params;

  // Validate inputs synchronously
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { package: true },
  });

  if (!lesson) throw new Error("课次不存在");
  if (!lesson.contentData) throw new Error("课次无内容数据");
  if (lesson.package.status !== "published") {
    throw new Error("课程包未发布");
  }

  const themePreset = await prisma.preset.findUnique({
    where: { category_name: { category: "slideshow_theme", name: themeKey } },
  });
  if (!themePreset) throw new Error(`主题「${themeKey}」不存在`);

  // Upsert draft as generating
  const draft = await prisma.slideshowDraft.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    update: {
      themeKey,
      status: "generating",
      progress: JSON.stringify({ step: 0, total: 1, message: "准备生成..." }),
      errorMessage: null,
      updatedAt: new Date(),
    },
    create: {
      lessonId,
      userId,
      themeKey,
      contentJson: "{}",
      status: "generating",
      progress: JSON.stringify({ step: 0, total: 1, message: "准备生成..." }),
    },
  });

  // Fire-and-forget async execution
  executeGeneration(draft.id, params, lesson, themePreset.value).catch(() => {
    // Errors are persisted in the draft — no need to propagate
  });

  return { draftId: draft.id };
}

/**
 * Async background execution — generates text, processes images, saves result.
 * Updates draft.progress at each step. Sets status to completed/failed on finish.
 */
async function executeGeneration(
  draftId: string,
  params: GenerateSlideshowParams,
  lesson: { id: string; lessonNo: number; title: string; contentData: string | null; package: { title: string; ageRange: string; level: string } },
  themeValue: string,
): Promise<void> {
  const { lessonId, userId, themeKey } = params;

  const updateProgress = async (progress: SlideshowProgress) => {
    await prisma.slideshowDraft.update({
      where: { id: draftId },
      data: { progress: JSON.stringify(progress) },
    });
  };

  try {
    // Step 1: AI text generation
    await updateProgress({ step: 1, total: 2, message: "正在转写课件内容..." });

    const context: TemplateContext = {
      title: lesson.package.title,
      ageRange: lesson.package.ageRange,
      level: lesson.package.level,
      lessonNo: lesson.lessonNo,
      lessonTitle: lesson.title,
      lessonContentData: lesson.contentData,
      themeConfig: `主题名称：${themeKey}\n${themeValue}`,
    };

    const templateResult = await resolveTemplate(ACTION_KEY, context);
    if (!templateResult) {
      throw new Error("课件生成 Prompt 模板未配置");
    }

    const { provider, model } = await getProviderAndModel(ACTION_KEY);

    const result = await provider.chat({
      systemPrompt: templateResult.prompt,
      userMessage: "请根据以上课次备课内容，生成学生课堂展示用的 PPT 课件。",
      model,
      temperature: 0.7,
      maxTokens: 8192,
    });

    const slideshowOutput = parseSlideshowOutput(result.content);

    // Log text generation cost
    const textCost = await calculateCallCostFromDb(ACTION_KEY, result.inputTokens, result.outputTokens);
    await prisma.courseRndAiCallLog.create({
      data: {
        projectId: null,
        pageKey: "slideshow",
        actionType: ACTION_KEY,
        modelName: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: textCost,
        userId,
        promptLog: templateResult.prompt,
        messageLog: "请根据以上课次备课内容，生成学生课堂展示用的 PPT 课件。",
        promptTemplateId: templateResult.templateId,
        promptTemplateVersionNo: templateResult.templateVersionNo,
      },
    });

    // Step 2: Process images
    // Extract hero image from contentData
    let heroImageUrl: string | null = null;
    try {
      const contentData = JSON.parse(lesson.contentData ?? "{}");
      heroImageUrl = contentData.hero?.imageUrl ?? null;
    } catch { /* ignore */ }

    const slidesWithImages = await processSlideImages(
      slideshowOutput.slides,
      { heroImageUrl, ageRange: lesson.package.ageRange, userId },
      async (step, total, message) => {
        await updateProgress({ step: step + 1, total: total + 1, message });
      },
    );

    // Save final result
    const finalOutput: SlideshowOutput = { slides: slidesWithImages };
    await prisma.slideshowDraft.update({
      where: { id: draftId },
      data: {
        contentJson: JSON.stringify(finalOutput),
        status: "completed",
        progress: JSON.stringify({
          step: 0,
          total: 0,
          message: `生成完成，共 ${slidesWithImages.length} 页`,
        }),
        errorMessage: null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成失败";
    await prisma.slideshowDraft.update({
      where: { id: draftId },
      data: {
        status: "failed",
        errorMessage: message,
        progress: null,
      },
    }).catch(() => { /* best effort */ });
  }
}

/**
 * Parse AI output into SlideshowOutput.
 * Handles JSON wrapped in markdown code blocks.
 */
function parseSlideshowOutput(raw: string): SlideshowOutput {
  let cleaned = raw.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error("AI 输出缺少 slides 数组");
    }

    return {
      slides: parsed.slides.map((slide: Record<string, unknown>) => ({
        type: slide.type ?? "content",
        title: slide.title ?? "",
        subtitle: slide.subtitle ?? null,
        body: slide.body ?? null,
        bullets: Array.isArray(slide.bullets) ? slide.bullets : null,
        imagePrompt: slide.imagePrompt ?? null,
        imageUrl: slide.imageUrl ?? null,
        notes: slide.notes ?? null,
      })),
    };
  } catch (e) {
    throw new Error(
      `课件 AI 输出解析失败: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
