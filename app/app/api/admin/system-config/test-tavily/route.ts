export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { searchWeb } from "@/lib/ai/tavily";

/** POST /api/admin/system-config/test-tavily — test Tavily API key */
export async function POST() {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  try {
    const result = await searchWeb("test");
    return NextResponse.json({
      data: { resultCount: result.results.length, success: true },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "测试失败" },
      { status: 400 }
    );
  }
}
