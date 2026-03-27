import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { resolveTemplate, type TemplateContext } from "@/lib/ai/template-engine";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import type { SlideshowOutput } from "@/types/slideshow";

const ACTION_KEY = "generate_slideshow";

export interface GenerateSlideshowParams {
  lessonId: string;
  userId: string;
  themeKey: string;
}

export interface GenerateSlideshowResult {
  slideshowOutput: SlideshowOutput;
  draftId: string;
}

/**
 * Generate slideshow content for a lesson.
 * 1. Load lesson + package context
 * 2. Resolve prompt template with baselines
 * 3. Call AI (non-streaming)
 * 4. Parse output, upsert SlideshowDraft
 * 5. Log AI call
 */
export async function generateSlideshow(
  params: GenerateSlideshowParams,
): Promise<GenerateSlideshowResult> {
  const { lessonId, userId, themeKey } = params;

  // 1. Load lesson with package
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { package: true },
  });

  if (!lesson) throw new Error("课次不存在");
  if (!lesson.contentData) throw new Error("课次无内容数据");
  if (lesson.package.status !== "published") {
    throw new Error("课程包未发布");
  }

  // 2. Load theme preset
  const themePreset = await prisma.preset.findUnique({
    where: { category_name: { category: "slideshow_theme", name: themeKey } },
  });
  if (!themePreset) throw new Error(`主题「${themeKey}」不存在`);

  // 3. Build template context
  const context: TemplateContext = {
    title: lesson.package.title,
    ageRange: lesson.package.ageRange,
    level: lesson.package.level,
    lessonNo: lesson.lessonNo,
    lessonTitle: lesson.title,
    lessonContentData: lesson.contentData,
    themeConfig: `主题名称：${themeKey}\n${themePreset.value}`,
  };

  // 4. Resolve prompt
  const templateResult = await resolveTemplate(ACTION_KEY, context);
  if (!templateResult) {
    throw new Error("课件生成 Prompt 模板未配置，请管理员在 Prompt 配置页添加 generate_slideshow 模板");
  }

  // 5. Get provider + model
  const { provider, model } = await getProviderAndModel(ACTION_KEY);

  // 6. Call AI
  const result = await provider.chat({
    systemPrompt: templateResult.prompt,
    userMessage: "请根据以上课次备课内容，生成学生课堂展示用的 PPT 课件。",
    model,
    temperature: 0.7,
    maxTokens: 8192,
  });

  // 7. Parse output
  const slideshowOutput = parseSlideshowOutput(result.content);

  // 8. Upsert SlideshowDraft
  const draft = await prisma.slideshowDraft.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    update: {
      themeKey,
      contentJson: JSON.stringify(slideshowOutput),
      updatedAt: new Date(),
    },
    create: {
      lessonId,
      userId,
      themeKey,
      contentJson: JSON.stringify(slideshowOutput),
    },
  });

  // 9. Log AI call
  const cost = await calculateCallCostFromDb(
    ACTION_KEY,
    result.inputTokens,
    result.outputTokens,
  );

  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: null,
      pageKey: "slideshow",
      actionType: ACTION_KEY,
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
      userId,
      promptLog: templateResult.prompt,
      messageLog: "请根据以上课次备课内容，生成学生课堂展示用的 PPT 课件。",
      promptTemplateId: templateResult.templateId,
      promptTemplateVersionNo: templateResult.templateVersionNo,
    },
  });

  return { slideshowOutput, draftId: draft.id };
}

/**
 * Parse AI output into SlideshowOutput.
 * Handles JSON wrapped in markdown code blocks.
 */
function parseSlideshowOutput(raw: string): SlideshowOutput {
  let cleaned = raw.trim();

  // Strip markdown code block if present
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
        notes: slide.notes ?? null,
      })),
    };
  } catch (e) {
    throw new Error(
      `课件 AI 输出解析失败: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
