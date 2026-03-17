export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { TEMPLATE_VARIABLES } from "@/lib/ai/template-variables";

export async function GET() {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  return NextResponse.json({ data: TEMPLATE_VARIABLES });
}
