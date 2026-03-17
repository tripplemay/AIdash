export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";
import { getBaselinePrompt } from "@/lib/ai/prompts";
import { getSystemPrompt, type TemplateContext } from "@/lib/ai/template-engine";
import { saveAiImage } from "@/lib/ai/image-store";
import { loadFrameworkContext, buildLessonListWithOverview, buildGeneratedLessonsSummary, buildRegenerateUserMessage } from "@/lib/ai/lesson-context";

const SECTION_STEPS = [
  { id: "core", label: "本课核心信息" },
  { id: "ai_value", label: "AI 环节价值说明" },
  { id: "prep", label: "课前备课提示单" },
  { id: "flow", label: "课堂执行清单" },
  { id: "issues", label: "学生卡点应对表" },
  { id: "materials", label: "本课附件与模板" },
  { id: "review", label: "课后复盘记录区" },
];

const SYSTEM_PROMPT = `你是课程设计助手。请根据用户提供的课程信息生成教学方案。

输出要求：只输出 JSON，不要用 markdown 代码块包裹，不要输出其他文字。

JSON 格式如下（所有字段必填）：
{
  "title": "课次标题",
  "subtitle": "一句话描述本课",
  "goal": "一句话目标",
  "outcome": "核心产出物名称",
  "tags": ["标签1", "标签2"],
  "positioning": "本课定位（一段话）",
  "conditions": ["适用条件1", "适用条件2"],
  "objectives": ["核心目标1", "核心目标2", "核心目标3"],
  "minimum_output": ["最小成果1", "最小成果2"],
  "ai_value_quote": "一句话说明 AI 在本课中的价值",
  "ai_rounds": [
    { "name": "AI 环节名称", "value": "该环节 AI 的作用说明" }
  ],
  "without_ai": ["没有 AI 学生会遇到的困难1", "困难2"],
  "student_must_do": ["学生仍需自己完成的事1", "事2"],
  "teacher_prep": ["教师准备事项1", "事项2"],
  "equipment": ["设备要求1", "要求2"],
  "reminder": "给教师的一句核心提醒",
  "flow": [
    {
      "title": "环节名称",
      "time": "0-5 分钟",
      "goal": "本环节目标",
      "actions": "教师要做什么（一段话）",
      "teacher_says": ["教师可以说的话1", "话2"],
      "ai_template": { "label": "AI 模板名称", "content": "学生输入给 AI 的模板文本" },
      "checkpoint": "本环节结束时要看到什么"
    }
  ],
  "issues": [
    { "question": "学生卡点描述", "answer": "教师应对话术" }
  ],
  "outcome_template": "学生成果模板的完整文本（含填空项）",
  "demo_case": {
    "name": "示范案例名称",
    "details": ["案例细节1", "细节2"]
  },
  "review_questions": ["课后复盘问题1", "问题2"],
  "parent_message": "家长沟通简版话术（一段话）",
  "hero_image_prompt": "课次主图的英文描述（用于 AI 绘画，描述一个适合儿童教育的可爱插画场景，和课程主题相关）",
  "illustration_prompt": "课内插图的英文描述（用于 AI 绘画，描述教师示范案例的可视化场景）",
  "template_image_prompt": "作品模板图的英文描述（用于 AI 绘画，描述学生成果作品的示意图）"
}

注意：
- flow 必须包含 4-6 个环节，覆盖整堂课时间
- 不是每个环节都有 ai_template，没有的设为 null
- checkpoint 没有的设为 null
- issues 至少 4 个
- 内容要具体实用，教师拿到就能直接上课`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; lessonNo: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id, lessonNo } = await params;
  const userId = (session.user as { id?: string })?.id;
  const lessonNoInt = parseInt(lessonNo);

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      title: true, ageRange: true, level: true,
      coreDeliverable: true, courseDirection: true,
      currentPlanVersionId: true, currentDirectionVersionId: true,
      orgForm: true, deliverableType: true, deliverableName: true,
      imageStylePrompt: true, coreNeeds: true, constraints: true,
    },
  });
  if (!project) return new Response(JSON.stringify({ error: "项目不存在" }), { status: 404 });

  const draft = await prisma.courseRndLessonDraft.findFirst({
    where: { planVersionId: project.currentPlanVersionId ?? "", lessonNo: lessonNoInt },
  });
  if (!draft) return new Response(JSON.stringify({ error: "课次草稿不存在" }), { status: 404 });

  const allDrafts = await prisma.courseRndLessonDraft.findMany({
    where: { planVersionId: project.currentPlanVersionId ?? "" },
    orderBy: { lessonNo: "asc" },
    select: { lessonNo: true, title: true, draftJson: true },
  });

  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("regenerate_lesson"));
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "AI 服务未配置" }), { status: 503 });
  }

  // 加载框架上下文（overview + summary）
  const { summary: courseSummary, framework } = await loadFrameworkContext(project.currentDirectionVersionId);
  const lessonListWithOverview = buildLessonListWithOverview(allDrafts, framework);
  const generatedLessonsSummary = buildGeneratedLessonsSummary(allDrafts, lessonNoInt);

  const userMessage = buildRegenerateUserMessage({
    project,
    courseSummary,
    lessonListWithOverview,
    generatedLessonsSummary,
    lessonNo: lessonNoInt,
    lessonTitle: draft.title,
  });

  // SSE 响应
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      sendEvent("progress", { step: 0, total: 7, label: "正在连接 AI 服务...", tokenCount: 0 });

      try {
        // 优先使用数据库 prompt 模板，fallback 到硬编码
        const templateCtx: TemplateContext = {
          title: project.title,
          courseDirection: project.courseDirection,
          ageRange: project.ageRange,
          level: project.level,
          orgForm: project.orgForm,
          deliverableType: project.deliverableType,
          deliverableName: project.deliverableName ?? project.coreDeliverable,
          imageStylePrompt: project.imageStylePrompt,
          coreNeeds: project.coreNeeds,
          constraints: project.constraints,
          lessonNo: lessonNoInt,
          lessonTitle: draft.title,
          allLessons: lessonListWithOverview,
          courseSummary,
        };
        const dbPrompt = await getSystemPrompt("regenerate_lesson", templateCtx);
        const systemPrompt = dbPrompt ?? (getBaselinePrompt() + SYSTEM_PROMPT);

        // 调用 AI（解析失败自动重试 1 次）
        let aiOutput: AiLessonOutput | null = null;
        let lastResult: { content: string; inputTokens: number; outputTokens: number; model: string } | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          let result: { content: string; inputTokens: number; outputTokens: number; model: string };

          if (provider.chatStream) {
            // Streaming mode: real progress
            const generator = provider.chatStream({
              systemPrompt,
              userMessage,
              model,
              maxTokens: 4096,
            });

            while (true) {
              const iterResult = await generator.next();
              if (iterResult.done) {
                // iterResult.value is ChatResult
                result = iterResult.value;
                break;
              }
              // iterResult.value is ChatStreamChunk
              const chunk = iterResult.value;
              const estimatedTokens = Math.round(chunk.totalChars / 2.5);
              sendEvent("progress", {
                step: Math.min(6, Math.floor(estimatedTokens / 300)),
                total: 7,
                label: `正在生成中（已接收 ${chunk.totalChars} 字符）...`,
                tokenCount: estimatedTokens,
              });
            }
          } else {
            // Non-streaming fallback: fake progress timer
            let currentStep = 0;
            const progressTimer = setInterval(() => {
              if (currentStep < 6) {
                currentStep++;
                sendEvent("progress", {
                  step: currentStep,
                  total: 7,
                  label: `正在生成「${SECTION_STEPS[currentStep]?.label ?? ""}」...`,
                  tokenCount: currentStep * 300,
                });
              }
            }, 5000);

            try {
              result = await provider.chat({
                systemPrompt,
                userMessage,
                model,
                maxTokens: 4096,
              });
            } finally {
              clearInterval(progressTimer);
            }
          }

          try {
            let raw = result.content;
            raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("未找到 JSON");
            aiOutput = JSON.parse(jsonMatch[0]);
            lastResult = result;
            break; // 解析成功，退出重试
          } catch {
            if (attempt === 0) {
              console.warn("AI 输出解析失败，自动重试...", result.content.slice(0, 200));
              sendEvent("progress", { step: 0, total: 7, label: "解析失败，正在重试...", tokenCount: 0 });
            } else {
              console.error("AI 输出解析失败（重试后仍失败），原始内容前500字符：", result.content.slice(0, 500));
              sendEvent("error", { message: "AI 输出解析失败，请重试" });
              controller.close();
              return;
            }
          }
        }

        if (!aiOutput) {
          sendEvent("error", { message: "AI 输出解析失败，请重试" });
          controller.close();
          return;
        }

        // 生成 Hero 封面图（仅此一张，其他图片待 v2 规范扩展 image block 后再加）
        sendEvent("progress", { step: 6, total: 7, label: "正在生成封面图...", tokenCount: 0 });
        const imageConfig = await getProviderAndModel("lesson_cover").catch(() => null);
        if (imageConfig?.provider?.generateImage && aiOutput.hero_image_prompt) {
          try {
            const stylePrefix = project.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";
            const img = await imageConfig.provider.generateImage({ prompt: stylePrefix + aiOutput.hero_image_prompt, model: imageConfig.model });
            aiOutput.hero_image_url = await saveAiImage(img.url, `lessons/${id}`);
            // 记录图片生成成本
            const imgCost = await calculateCallCostFromDb("lesson_cover", 0, 0);
            await prisma.courseRndAiCallLog.create({
              data: {
                projectId: id, pageKey: "workbench", actionType: "lesson_cover",
                modelName: imageConfig.model, inputTokens: 0, outputTokens: 0,
                estimatedCost: imgCost, userId: userId ?? null,
              },
            });
          } catch {
            // 图片生成失败不阻断主流程
          }
        }

        // 系统组装 v2 contentData（格式 100% 正确）
        const contentData = buildContentData(aiOutput);

        // 更新数据库
        await prisma.courseRndLessonDraft.update({
          where: { id: draft.id },
          data: {
            title: aiOutput.title || draft.title,
            contentData: JSON.stringify(contentData),
            draftJson: JSON.stringify(aiOutput),
          },
        });

        const cost = lastResult ? await calculateCallCostFromDb("regenerate_lesson", lastResult.inputTokens, lastResult.outputTokens) : 0;
        await prisma.courseRndAiCallLog.create({
          data: {
            projectId: id,
            pageKey: "workbench",
            actionType: "regenerate_lesson",
            modelName: lastResult?.model ?? model,
            inputTokens: lastResult?.inputTokens ?? 0,
            outputTokens: lastResult?.outputTokens ?? 0,
            estimatedCost: cost,
            userId: userId ?? null,
          },
        });

        sendEvent("progress", { step: 7, total: 7, label: "生成完成", tokenCount: lastResult?.outputTokens ?? 0 });
        sendEvent("done", {
          lessonNo: lessonNoInt,
          contentData,
          tokens: { input: lastResult?.inputTokens ?? 0, output: lastResult?.outputTokens ?? 0 },
          cost,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendEvent("error", { message: `AI 调用失败：${msg}` });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
