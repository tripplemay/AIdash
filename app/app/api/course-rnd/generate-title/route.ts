export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { resolveLightPrompt, type TemplateContext } from "@/lib/ai/template-engine";

/** 硬编码回退 prompt */
function defaultTitlePrompt(ctx: TemplateContext): string {
  const parts: string[] = [];
  if (ctx.courseDirection) parts.push(`课程方向：${ctx.courseDirection}`);
  if (ctx.ageRange) parts.push(`目标年龄段：${ctx.ageRange}`);
  if (ctx.level) parts.push(`难度级别：${ctx.level}`);
  const context = parts.length > 0 ? parts.join("，") : "AI 辅助教学课程";
  return `请为以下课程生成一个简洁有吸引力的项目名称，只输出名称文字，不要输出其他内容。\n${context}`;
}

// POST /api/course-rnd/generate-title
export async function POST(request: Request) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const body = await request.json();
  const { courseDirection, ageRange, level } = body;

  // 复用 generate_framework 的模型配置
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("generate_framework"));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 服务未配置" },
      { status: 503 },
    );
  }

  const templateCtx: TemplateContext = {
    courseDirection: courseDirection || null,
    ageRange: ageRange || null,
    level: level || null,
  };

  const dbPrompt = await resolveLightPrompt("generate_title", templateCtx);
  const prompt = dbPrompt ?? defaultTitlePrompt(templateCtx);

  try {
    const result = await provider.chat({
      systemPrompt: prompt,
      userMessage: "请生成课程名称",
      model,
      maxTokens: 100,
      temperature: 0.9,
    });

    // 清理：去掉引号、换行等
    const title = result.content
      .replace(/^["'《「]|["'》」]$/g, "")
      .replace(/\n/g, "")
      .trim();

    return NextResponse.json({ data: { title } });
  } catch (e) {
    return NextResponse.json(
      { error: `生成失败：${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
