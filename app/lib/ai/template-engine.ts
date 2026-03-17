import { prisma } from "@/lib/prisma";
import { assembleBaselines } from "./baseline-assembler";

export interface TemplateContext {
  // 项目信息
  title?: string | null;
  courseDirection?: string | null;
  ageRange?: string | null;
  level?: string | null;
  orgForm?: string | null;
  deliverableType?: string | null;
  deliverableName?: string | null;
  lessonCount?: number | null;
  imageStylePrompt?: string | null;
  roughFramework?: string | null;
  coreNeeds?: string | null;
  constraints?: string | null;
  // 上下文
  courseSummary?: string | null;
  lessonNo?: number | null;
  lessonTitle?: string | null;
  allLessons?: string | null;
  currentPlan?: string | null;
  feedback?: string | null;
  targetSection?: string | null;
}

// ── Label lookup helpers ──

async function loadLabel(
  type: string,
  key: string | null | undefined,
): Promise<string> {
  if (!key) return "未指定";
  const doc = await prisma.baselineDoc.findUnique({
    where: { type_key: { type, key } },
    select: { label: true },
  });
  return doc?.label ?? "未指定";
}

async function loadLabels(
  ctx: TemplateContext,
): Promise<Record<string, string>> {
  const [ageLabel, levelLabel, orgFormLabel, deliverableLabel] =
    await Promise.all([
      loadLabel("age", ctx.ageRange),
      loadLabel("level", ctx.level),
      loadLabel("org_form", ctx.orgForm),
      loadLabel("deliverable", ctx.deliverableType),
    ]);

  return {
    年龄段标签: ageLabel,
    级别标签: levelLabel,
    组织形态标签: orgFormLabel,
    产出物标签: deliverableLabel,
  };
}

// ── Variable map builder ──

function buildVariableMap(
  ctx: TemplateContext,
  baselines: Awaited<ReturnType<typeof assembleBaselines>>,
  labels: Record<string, string>,
): Record<string, string> {
  const str = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "未指定";
    return String(v);
  };

  return {
    // 项目信息
    项目标题: str(ctx.title),
    课程方向: str(ctx.courseDirection),
    目标年龄段: str(ctx.ageRange),
    目标级别: str(ctx.level),
    课程组织形态: str(ctx.orgForm),
    产出物形态: str(ctx.deliverableType),
    产出物名称: str(ctx.deliverableName),
    预计课次数: str(ctx.lessonCount),
    图片风格描述: str(ctx.imageStylePrompt),
    大致框架: str(ctx.roughFramework),
    核心诉求: str(ctx.coreNeeds),
    补充约束: str(ctx.constraints),
    // 标签
    ...labels,
    // 基线
    通用基线: baselines.general || "未指定",
    年龄段基线: baselines.age || "未指定",
    级别基线: baselines.level || "未指定",
    组织形态基线: baselines.orgForm || "未指定",
    产出物基线: baselines.deliverable || "未指定",
    分层规则矩阵: baselines.matrix || "未指定",
    // 上下文
    课程整体摘要: str(ctx.courseSummary),
    当前课次号: str(ctx.lessonNo),
    当前课次标题: str(ctx.lessonTitle),
    全部课次概览: str(ctx.allLessons),
    当前课次方案: str(ctx.currentPlan),
    修改意见: str(ctx.feedback),
    目标板块: str(ctx.targetSection),
  };
}

// ── Template interpolation ──

function interpolate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (match, varName: string) => {
    const trimmed = varName.trim();
    if (trimmed in variables) {
      return variables[trimmed];
    }
    // Unknown variable — leave as-is
    return match;
  });
}

// ── Public API ──

/**
 * Resolve a prompt template from DB, filling in all {{变量名}} placeholders.
 * Returns null if no template is configured for this actionKey.
 */
export async function resolveTemplate(
  actionKey: string,
  context: TemplateContext,
): Promise<string | null> {
  const template = await prisma.promptTemplate.findUnique({
    where: { actionKey },
    select: { content: true },
  });

  if (!template) return null;

  const [baselines, labels] = await Promise.all([
    assembleBaselines({
      ageRange: context.ageRange,
      level: context.level,
      orgForm: context.orgForm,
      deliverableType: context.deliverableType,
    }),
    loadLabels(context),
  ]);

  const variables = buildVariableMap(context, baselines, labels);
  return interpolate(template.content, variables);
}

/**
 * Convenience wrapper: returns resolved prompt or null (caller falls back to hardcoded).
 */
export async function getSystemPrompt(
  actionKey: string,
  context: TemplateContext,
): Promise<string | null> {
  return resolveTemplate(actionKey, context);
}
