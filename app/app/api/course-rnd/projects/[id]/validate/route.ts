export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { getBaselinePrompt, validateLessonPrompt } from "@/lib/ai/prompts";
import { resolveTemplate, type TemplateContext } from "@/lib/ai/template-engine";
import { loadFrameworkContext } from "@/lib/ai/lesson-context";

/** 12 个固定检查项名称 */
const VALIDATION_CRITERIA = [
  "课次目标清晰度",
  "AI 环节实际价值",
  "课堂流程时间分配",
  "学生卡点充分性",
  "成果模板可操作性",
  "年龄段适配性",
  "课次间递进关系",
  "作品感",
  "课次独立性",
  "禁止跑偏检查",
  "AI 工具落地可执行性",
  "工具降级与备选方案",
];

interface DraftJson {
  title?: string;
  subtitle?: string;
  goal?: string;
  outcome?: string;
  flow?: Array<{
    title?: string;
    time?: string;
    tool_usage?: {
      tool_type?: string;
      tool_name?: string;
      entry_method?: string;
      operator?: string;
      student_action?: string;
      fallback?: string;
    } | null;
  }>;
  issues?: Array<unknown>;
  tool_plan?: {
    tools?: Array<{
      tool_type?: string;
      recommended?: string;
      alternatives?: string[];
      purpose?: string;
      used_in_flows?: string[];
    }>;
    operator?: string;
    student_mode?: string;
    fallback?: string;
  } | null;
  ai_rounds?: Array<{ name?: string; value?: string }>;
  equipment?: string[];
}

/** Extract concise fields from draftJson to control token usage */
function summarizeDraft(raw: string): string {
  try {
    const parsed: DraftJson = JSON.parse(raw);
    const parts: string[] = [];
    if (parsed.title) parts.push(`标题：${parsed.title}`);
    if (parsed.subtitle) parts.push(`副标题：${parsed.subtitle}`);
    if (parsed.goal) parts.push(`目标：${parsed.goal}`);
    if (parsed.outcome) parts.push(`成果：${parsed.outcome}`);
    if (Array.isArray(parsed.flow)) {
      const flowSummary = parsed.flow
        .map(f => {
          const toolInfo = f.tool_usage ? ` [工具:${f.tool_usage.tool_name ?? f.tool_usage.tool_type ?? "?"},操作:${f.tool_usage.operator ?? "?"}]` : "";
          return `${f.title ?? "未命名"}(${f.time ?? "?"})${toolInfo}`;
        })
        .join("、");
      parts.push(`流程：${flowSummary}`);
    }
    if (Array.isArray(parsed.issues)) {
      parts.push(`卡点数：${parsed.issues.length}`);
    }
    if (parsed.tool_plan && Array.isArray(parsed.tool_plan.tools) && parsed.tool_plan.tools.length > 0) {
      const toolsSummary = parsed.tool_plan.tools.map(t => {
        const alts = Array.isArray(t.alternatives) && t.alternatives.length > 0 ? `,备选:${t.alternatives.join("/")}` : "";
        return `${t.tool_type ?? "?"}(推荐:${t.recommended ?? "?"}${alts})`;
      }).join("、");
      parts.push(`工具总览：${toolsSummary}`);
      if (parsed.tool_plan.operator) parts.push(`默认操作：${parsed.tool_plan.operator}`);
      if (parsed.tool_plan.fallback) parts.push(`整课降级：${parsed.tool_plan.fallback}`);
    } else {
      parts.push("工具总览：无 tool_plan");
    }
    if (Array.isArray(parsed.equipment) && parsed.equipment.length > 0) {
      parts.push(`设备：${parsed.equipment.join("、")}`);
    }
    return parts.join("\n");
  } catch {
    return "(解析失败)";
  }
}

/** 解析一行验证输出，返回 item 或 overall 事件数据 */
function parseValidationLine(line: string): {
  type: "item";
  index: number;
  criterion: string;
  status: string;
  detail: string;
} | {
  type: "overall";
  overallPass: boolean;
  summary: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // OVERALL|pass或fail|summary
  const overallMatch = trimmed.match(/^OVERALL\|(pass|fail)\|(.+)$/i);
  if (overallMatch) {
    return {
      type: "overall",
      overallPass: overallMatch[1].toLowerCase() === "pass",
      summary: overallMatch[2].trim(),
    };
  }

  // 序号|status|detail — 用 indexOf 精确分割前两个 |
  const firstPipe = trimmed.indexOf("|");
  if (firstPipe === -1) return null;
  const secondPipe = trimmed.indexOf("|", firstPipe + 1);
  if (secondPipe === -1) return null;

  const indexStr = trimmed.slice(0, firstPipe).trim();
  const status = trimmed.slice(firstPipe + 1, secondPipe).trim().toLowerCase();
  const detail = trimmed.slice(secondPipe + 1).trim();

  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 1 || index > VALIDATION_CRITERIA.length) return null;
  if (!["pass", "warning", "fail"].includes(status)) return null;

  return {
    type: "item",
    index,
    criterion: VALIDATION_CRITERIA[index - 1] ?? `检查项 ${index}`,
    status,
    detail,
  };
}

// POST /api/course-rnd/projects/[id]/validate (SSE streaming)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  // Load project
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      title: true,
      ageRange: true,
      level: true,
      courseDirection: true,
      coreDeliverable: true,
      orgForm: true,
      deliverableType: true,
      coreNeeds: true,
      constraints: true,
      currentPlanVersionId: true,
      currentDirectionVersionId: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  if (!project.currentPlanVersionId) {
    return NextResponse.json({ error: "无方案版本，无法审核" }, { status: 400 });
  }

  // Load lesson drafts for current plan version
  const drafts = await prisma.courseRndLessonDraft.findMany({
    where: { planVersionId: project.currentPlanVersionId },
    select: { lessonNo: true, title: true, draftJson: true },
    orderBy: { lessonNo: "asc" },
  });

  const draftsWithContent = drafts.filter(d => d.draftJson);
  if (draftsWithContent.length === 0) {
    return NextResponse.json({ error: "尚无已生成的课次方案，无法审核" }, { status: 400 });
  }

  // Load framework context
  const { summary: courseSummary } = await loadFrameworkContext(project.currentDirectionVersionId);

  // Get AI provider
  let provider, model: string;
  try {
    ({ provider, model } = await getProviderAndModel("validate_lesson"));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 审核服务未配置" },
      { status: 503 }
    );
  }

  // Build system prompt (DB template fallback to hardcoded)
  const templateCtx: TemplateContext = {
    title: project.title,
    courseDirection: project.courseDirection,
    ageRange: project.ageRange,
    level: project.level,
    orgForm: project.orgForm,
    deliverableType: project.deliverableType,
    deliverableName: project.coreDeliverable,
    coreNeeds: project.coreNeeds,
    constraints: project.constraints,
    courseSummary,
  };
  const templateResult = await resolveTemplate("validate_lesson", templateCtx);
  const systemPrompt = templateResult?.prompt ?? (getBaselinePrompt() + validateLessonPrompt());

  // Build concise user message
  const projectInfo = [
    `课程标题：${project.title}`,
    `课程方向：${project.courseDirection ?? "未指定"}`,
    `年龄段：${project.ageRange ?? "未指定"}`,
    `级别：${project.level ?? "未指定"}`,
    `课程组织形态：${project.orgForm ?? "未指定"}`,
    `产出物类型：${project.deliverableType ?? "未指定"}`,
    `核心诉求：${project.coreNeeds ?? "无"}`,
    `补充约束：${project.constraints ?? "无"}`,
  ].join("\n");

  const lessonsText = draftsWithContent
    .map(d => `--- 第 ${d.lessonNo} 课：${d.title} ---\n${summarizeDraft(d.draftJson!)}`)
    .join("\n\n");

  const userMessage = `课程信息：\n${projectInfo}\n\n${courseSummary ? `课程整体定位：${courseSummary}\n\n` : ""}全部课次概要：\n${lessonsText}\n\n请逐项审核以上课程方案。`;

  // SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;
        let modelName = model;
        const processedLines = new Set<string>();

        function processCompletedLines() {
          const lines = fullContent.split("\n");
          // 最后一行可能不完整，不处理
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (processedLines.has(line)) continue;
            processedLines.add(line);

            const parsed = parseValidationLine(line);
            if (!parsed) continue;

            if (parsed.type === "item") {
              sendEvent("item", {
                index: parsed.index,
                criterion: parsed.criterion,
                status: parsed.status,
                detail: parsed.detail,
              });
            } else if (parsed.type === "overall") {
              sendEvent("overall", {
                overallPass: parsed.overallPass,
                summary: parsed.summary,
              });
            }
          }
        }

        if (provider.chatStream) {
          // Streaming mode
          const generator = provider.chatStream({
            systemPrompt,
            userMessage,
            model,
            maxTokens: 4096,
          });

          while (true) {
            const iterResult = await generator.next();
            if (iterResult.done) {
              // ChatResult returned on completion
              const result = iterResult.value;
              inputTokens = result.inputTokens;
              outputTokens = result.outputTokens;
              modelName = result.model;
              fullContent = result.content;
              break;
            }
            const chunk = iterResult.value;
            fullContent += chunk.text;
            processCompletedLines();
          }
        } else {
          // Non-streaming fallback
          const result = await provider.chat({
            systemPrompt,
            userMessage,
            model,
            maxTokens: 4096,
          });
          fullContent = result.content;
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          modelName = result.model;
        }

        // 处理剩余行（流结束后最后一行完整了）
        const remainingLines = fullContent.split("\n");
        for (const line of remainingLines) {
          if (processedLines.has(line)) continue;
          processedLines.add(line);
          const parsed = parseValidationLine(line);
          if (!parsed) continue;
          if (parsed.type === "item") {
            sendEvent("item", {
              index: parsed.index,
              criterion: parsed.criterion,
              status: parsed.status,
              detail: parsed.detail,
            });
          } else if (parsed.type === "overall") {
            sendEvent("overall", {
              overallPass: parsed.overallPass,
              summary: parsed.summary,
            });
          }
        }

        // Fallback: 如果一个 item 都没解析出来，尝试 JSON 解析（兼容旧格式 DB 模板）
        if (processedLines.size === 0 || ![...processedLines].some(l => parseValidationLine(l)?.type === "item")) {
          try {
            let raw = fullContent.replace(/```json\s*/g, "").replace(/```\s*/g, "");
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const report = JSON.parse(jsonMatch[0]);
              if (Array.isArray(report.items)) {
                for (let i = 0; i < report.items.length; i++) {
                  const item = report.items[i];
                  sendEvent("item", {
                    index: i + 1,
                    criterion: item.criterion ?? VALIDATION_CRITERIA[i] ?? `检查项 ${i + 1}`,
                    status: item.status ?? "warning",
                    detail: item.detail ?? "",
                  });
                }
              }
              if (typeof report.overallPass === "boolean") {
                sendEvent("overall", {
                  overallPass: report.overallPass,
                  summary: report.summary ?? "",
                });
              }
            }
          } catch {
            // JSON fallback 也失败
          }
        }

        // Log AI call
        const cost = await calculateCallCostFromDb("validate_lesson", inputTokens, outputTokens);
        await prisma.courseRndAiCallLog.create({
          data: {
            projectId: id,
            pageKey: "workbench",
            actionType: "validate_lesson",
            modelName,
            inputTokens,
            outputTokens,
            estimatedCost: cost,
            userId: userId ?? null,
            promptLog: systemPrompt,
            messageLog: userMessage,
            promptTemplateId: templateResult?.templateId ?? null,
            promptTemplateVersionNo: templateResult?.templateVersionNo ?? null,
          },
        });

        sendEvent("done", {
          tokens: { input: inputTokens, output: outputTokens },
          cost,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendEvent("error", { message: `AI 审核失败：${msg}` });
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
