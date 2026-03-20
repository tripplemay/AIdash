export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";
import { getBaselinePrompt } from "@/lib/ai/prompts";
import { resolveTemplate, type TemplateContext } from "@/lib/ai/template-engine";
import { saveAiImage } from "@/lib/ai/image-store";
import { loadFrameworkContext, buildLessonListWithOverview, buildGeneratedLessonsSummary, buildRegenerateUserMessage } from "@/lib/ai/lesson-context";

const SECTION_STEPS = [
  { id: "core", label: "本课核心信息" },
  { id: "ai_value", label: "AI 环节价值说明" },
  { id: "prep", label: "课前备课提示单" },
  { id: "tool_plan", label: "AI 工具方案" },
  { id: "flow", label: "课堂执行清单" },
  { id: "issues", label: "学生卡点应对表" },
  { id: "materials", label: "本课附件与模板" },
  { id: "review", label: "课后复盘记录区" },
];

const TOTAL_STEPS = SECTION_STEPS.length; // 8

/** 根据已接收的 JSON 文本检测当前正在生成哪个板块 */
function detectSectionStep(content: string): number {
  // 按 JSON 字段出现顺序检测（后出现的优先级高，带冒号避免文本内容误匹配）
  if (content.includes('"review_questions":') || content.includes('"parent_message":')) return 8;
  if (content.includes('"outcome_template":') || content.includes('"demo_case":')) return 7;
  if (content.includes('"issues":')) return 6;
  if (content.includes('"flow":')) return 5;
  if (content.includes('"tool_plan":')) return 4;
  if (content.includes('"teacher_prep":') || content.includes('"equipment":')) return 3;
  if (content.includes('"ai_value_quote":') || content.includes('"ai_rounds":')) return 2;
  if (content.includes('"positioning":') || content.includes('"title":')) return 1;
  return 0;
}

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
  "tool_plan": {
    "tools": [
      {
        "tool_type": "工具类型（如 对话式 AI、AI 绘画、AI 音乐等，按能力类型分类，不按品牌）",
        "recommended": "推荐工具名称（如 ChatGPT、Midjourney）",
        "alternatives": ["备选工具1（如 Kimi）", "备选工具2（如 文心一言）"],
        "purpose": "本课中该类工具的用途说明",
        "used_in_flows": ["使用该类工具的环节标题（须与 flow 中的 title 一致）"]
      }
    ],
    "operator": "整课默认操作者说明（如 教师统一操作，学生观看大屏）",
    "student_mode": "学生参与模式概述（如 学生口述需求，教师输入 AI）",
    "fallback": "所有工具不可用时的整体降级方案"
  },
  "flow": [
    {
      "title": "环节名称",
      "time": "0-5 分钟",
      "goal": "本环节目标",
      "actions": "教师要做什么（一段话）",
      "teacher_says": ["教师可以说的话1", "话2"],
      "ai_template": { "label": "AI 模板名称", "content": "学生输入给 AI 的模板文本" },
      "checkpoint": "本环节结束时要看到什么",
      "tool_usage": {
        "tool_type": "工具类型（须与 tool_plan.tools 中的 tool_type 对应）",
        "tool_name": "本环节推荐使用的具体工具名称",
        "entry_method": "如何进入工具开始使用（如 教师打开已登录页面并投屏、学生扫码进入、教师代输学生口述内容）",
        "operator": "本环节谁操作（可覆盖 tool_plan 顶层默认值）",
        "student_action": "学生具体参与方式",
        "fallback": "本环节工具不可用时的替代方案"
      }
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
  "hero_image_prompt": "课次主图的英文描述（用于 AI 绘画，必须根据目标年龄段调整画面风格：低龄段用简单可爱、色彩鲜明的元素，高龄段可用更精细复杂的场景。描述要和课程主题相关）",
  "illustration_prompt": "课内插图的英文描述（用于 AI 绘画，风格需适配目标年龄段，描述教师示范案例的可视化场景）",
  "template_image_prompt": "作品模板图的英文描述（用于 AI 绘画，风格需适配目标年龄段，描述学生成果作品的示意图）"
}

注意：
- flow 必须包含 4-6 个环节，覆盖整堂课时间
- 不是每个环节都有 ai_template，没有的设为 null
- checkpoint 没有的设为 null
- 不是每个 flow 环节都有 tool_usage，没有 AI 工具操作的环节（如课程导入、成果展示）设为 null
- tool_plan 中每种 tool_type 只出现一次，同类工具归为一个条目
- tool_plan.tools 中每个工具类型至少列 1 个推荐 + 1 个备选（考虑国内外可用性差异）
- tool_usage.tool_type 必须与 tool_plan.tools 中的 tool_type 对应
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

      sendEvent("progress", { step: 0, total: TOTAL_STEPS, label: "正在连接 AI 服务...", tokenCount: 0 });

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
        const templateResult = await resolveTemplate("regenerate_lesson", templateCtx);
        const systemPrompt = templateResult?.prompt ?? (getBaselinePrompt() + SYSTEM_PROMPT);

        // 调用 AI（解析失败自动重试 1 次）
        let aiOutput: AiLessonOutput | null = null;
        let lastResult: { content: string; inputTokens: number; outputTokens: number; model: string } | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          let result: { content: string; inputTokens: number; outputTokens: number; model: string };

          if (provider.chatStream) {
            // Streaming mode: real section detection
            const generator = provider.chatStream({
              systemPrompt,
              userMessage,
              model,
              maxTokens: 16384,
            });

            let streamedContent = "";
            let lastStep = 0;
            let lastHeartbeatChars = 0;
            let lastSentChars = 0;

            while (true) {
              const iterResult = await generator.next();
              if (iterResult.done) {
                result = iterResult.value;
                break;
              }
              const chunk = iterResult.value;
              streamedContent += chunk.text;

              // 根据 JSON 字段名检测当前生成的板块
              const step = detectSectionStep(streamedContent);
              const stepChanged = step !== lastStep;
              const heartbeat = chunk.totalChars - lastHeartbeatChars >= 500;

              if (stepChanged || heartbeat) {
                lastStep = step;
                lastHeartbeatChars = chunk.totalChars;
                const textDelta = streamedContent.slice(lastSentChars);
                lastSentChars = streamedContent.length;
                sendEvent("progress", {
                  step,
                  total: TOTAL_STEPS,
                  label: `正在生成「${SECTION_STEPS[step]?.label ?? ""}」...`,
                  tokenCount: Math.round(chunk.totalChars / 2.5),
                  textDelta,
                  totalChars: chunk.totalChars,
                });
              }
            }
          } else {
            // Non-streaming fallback: fake progress timer
            let currentStep = 0;
            const progressTimer = setInterval(() => {
              if (currentStep < TOTAL_STEPS) {
                currentStep++;
                sendEvent("progress", {
                  step: currentStep,
                  total: TOTAL_STEPS,
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
                maxTokens: 16384,
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
              sendEvent("progress", { step: 0, total: TOTAL_STEPS, label: "解析失败，正在重试...", tokenCount: 0 });
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

        // 7 步文本生成完成
        sendEvent("progress", { step: TOTAL_STEPS, total: TOTAL_STEPS, label: "文本生成完成", tokenCount: lastResult?.outputTokens ?? 0 });

        // 生成 Hero 封面图（仅此一张，其他图片待 v2 规范扩展 image block 后再加）
        sendEvent("progress", { step: TOTAL_STEPS + 1, total: TOTAL_STEPS + 1, label: "正在生成封面图...", tokenCount: 0 });
        const imageConfig = await getProviderAndModel("lesson_cover").catch(() => null);
        if (imageConfig?.provider?.generateImage && aiOutput.hero_image_prompt) {
          try {
            // 查询构图引导 Preset（仅 hero 图使用）
            const compositionPreset = await prisma.preset.findFirst({
              where: { category: "image_composition", isActive: true },
              select: { value: true },
            });
            const compositionGuide = compositionPreset?.value ? `${compositionPreset.value} ` : "";
            const stylePrefix = project.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";
            const ageHint = project.ageRange ? `Designed for ${project.ageRange} age group. ` : "";
            const img = await imageConfig.provider.generateImage({ prompt: compositionGuide + ageHint + stylePrefix + aiOutput.hero_image_prompt, model: imageConfig.model });
            aiOutput.hero_image_url = await saveAiImage(img.url, `lessons/${id}`);
            // 记录图片生成成本
            const imgCost = await calculateCallCostFromDb("lesson_cover", 0, 0);
            await prisma.courseRndAiCallLog.create({
              data: {
                projectId: id, pageKey: "workbench", actionType: "lesson_cover",
                modelName: imageConfig.model, inputTokens: 0, outputTokens: 0,
                estimatedCost: imgCost, userId: userId ?? null,
                promptLog: compositionGuide + ageHint + stylePrefix + aiOutput.hero_image_prompt,
                messageLog: null,
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
            promptLog: systemPrompt,
            messageLog: userMessage,
            promptTemplateId: templateResult?.templateId ?? null,
            promptTemplateVersionNo: templateResult?.templateVersionNo ?? null,
          },
        });

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
