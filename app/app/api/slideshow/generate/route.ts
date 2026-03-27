import { NextRequest, NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { VALID_ROLES } from "@/lib/roles";
import { triggerGeneration } from "@/lib/slideshow/generate";

export async function POST(req: NextRequest) {
  const session = await requireRole(VALID_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id: string }).id;

  let body: { lessonId?: string; themeKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { lessonId, themeKey } = body;
  if (!lessonId || !themeKey) {
    return NextResponse.json(
      { error: "缺少必填参数 lessonId 和 themeKey" },
      { status: 400 },
    );
  }

  try {
    const { draftId } = await triggerGeneration({ lessonId, userId, themeKey });
    return NextResponse.json({
      data: { draftId, status: "generating" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
