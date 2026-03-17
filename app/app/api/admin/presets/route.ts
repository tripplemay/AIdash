export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET(request: Request) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const presets = await prisma.preset.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ data: presets });
}

export async function POST(request: Request) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const body = await request.json();
  const { category, name, value, sortOrder } = body;

  if (!category || !name || !value) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const preset = await prisma.preset.create({
    data: {
      category,
      name,
      value,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ data: preset }, { status: 201 });
}
