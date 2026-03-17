import { prisma } from "@/lib/prisma";

interface FrameworkLesson {
  lessonNo: number;
  title: string;
  overview: string;
}

interface DraftSummary {
  lessonNo: number;
  title: string;
  subtitle?: string;
  goal?: string;
  outcome?: string;
}

/**
 * 从 DirectionVersion 读取框架 overview + summary
 */
export async function loadFrameworkContext(currentDirectionVersionId: string | null) {
  if (!currentDirectionVersionId) return { summary: "", framework: [] as FrameworkLesson[] };

  const dirVersion = await prisma.courseRndDirectionVersion.findUnique({
    where: { id: currentDirectionVersionId },
    select: { frameworkJson: true, summary: true },
  });

  if (!dirVersion) return { summary: "", framework: [] as FrameworkLesson[] };

  let framework: FrameworkLesson[] = [];
  try {
    framework = JSON.parse(dirVersion.frameworkJson ?? "[]");
  } catch {}

  return { summary: dirVersion.summary ?? "", framework };
}

/**
 * 构建带 overview 的课次列表文本
 */
export function buildLessonListWithOverview(
  drafts: Array<{ lessonNo: number; title: string }>,
  framework: FrameworkLesson[],
): string {
  const overviewMap = new Map(framework.map(f => [f.lessonNo, f.overview]));

  return drafts.map(d => {
    const overview = overviewMap.get(d.lessonNo);
    return overview
      ? `第 ${d.lessonNo} 课：${d.title} — ${overview}`
      : `第 ${d.lessonNo} 课：${d.title}`;
  }).join("\n");
}

/**
 * 从已生成课次的 draftJson 中提取摘要（控制 token）
 */
export function buildGeneratedLessonsSummary(
  drafts: Array<{ lessonNo: number; title: string; draftJson: string | null }>,
  excludeLessonNo: number,
): string {
  const summaries: string[] = [];

  for (const d of drafts) {
    if (d.lessonNo === excludeLessonNo || !d.draftJson) continue;

    try {
      const parsed = JSON.parse(d.draftJson) as DraftSummary;
      const parts = [`第 ${d.lessonNo} 课「${parsed.title ?? d.title}」`];
      if (parsed.subtitle) parts.push(`主题：${parsed.subtitle}`);
      if (parsed.goal) parts.push(`目标：${parsed.goal}`);
      if (parsed.outcome) parts.push(`成果：${parsed.outcome}`);
      summaries.push(parts.join("，"));
    } catch {
      // draftJson 解析失败则跳过
    }
  }

  return summaries.length > 0
    ? "已生成课次摘要：\n" + summaries.join("\n")
    : "";
}

/**
 * 构建 regenerate 的完整 userMessage
 */
export function buildRegenerateUserMessage(params: {
  project: {
    title: string;
    courseDirection: string | null;
    ageRange: string | null;
    level: string | null;
    coreDeliverable: string | null;
    orgForm: string | null;
    deliverableType: string | null;
    deliverableName: string | null;
    imageStylePrompt: string | null;
    coreNeeds: string | null;
    constraints: string | null;
  };
  courseSummary: string;
  lessonListWithOverview: string;
  generatedLessonsSummary: string;
  lessonNo: number;
  lessonTitle: string;
}): string {
  const { project: p, courseSummary, lessonListWithOverview, generatedLessonsSummary, lessonNo, lessonTitle } = params;

  const lines = [
    "课程信息：",
    `课程标题：${p.title}`,
    `课程方向：${p.courseDirection ?? "未指定"}`,
    `年龄段：${p.ageRange ?? "未指定"}`,
    `级别：${p.level ?? "未指定"}`,
    `核心产出物：${p.deliverableName ?? p.coreDeliverable ?? "未指定"}`,
    `课程组织形态：${p.orgForm ?? "未指定"}`,
    `产出物类型：${p.deliverableType ?? "未指定"}`,
    `核心诉求：${p.coreNeeds ?? "无"}`,
    `补充约束：${p.constraints ?? "无"}`,
  ];

  if (p.imageStylePrompt) {
    lines.push(`图片风格：${p.imageStylePrompt}`);
  }

  if (courseSummary) {
    lines.push("", `课程整体定位：${courseSummary}`);
  }

  lines.push("", "全部课次概览：", lessonListWithOverview);

  if (generatedLessonsSummary) {
    lines.push("", generatedLessonsSummary);
  }

  lines.push("", `请为第 ${lessonNo} 课「${lessonTitle}」生成完整的教学方案。`);

  return lines.join("\n");
}
