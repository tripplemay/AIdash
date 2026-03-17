export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

interface DropdownItem {
  key: string;
  label: string;
}

interface DeliverableGroup {
  group: string;
  items: DropdownItem[];
}

export async function GET() {
  if (!(await requireRole(COURSE_RND_ROLES))) {
    return forbiddenResponse();
  }

  const [baselineDocs, presets] = await Promise.all([
    prisma.baselineDoc.findMany({
      where: { type: { in: ["age", "level", "org_form", "deliverable"] } },
      select: { type: true, key: true, label: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.preset.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const ageRanges: DropdownItem[] = [];
  const levels: DropdownItem[] = [];
  const orgForms: DropdownItem[] = [];
  const basicDeliverables: DropdownItem[] = [];
  const extendedDeliverables: DropdownItem[] = [];

  for (const doc of baselineDocs) {
    const item: DropdownItem = { key: doc.key, label: doc.label };
    switch (doc.type) {
      case "age":
        ageRanges.push(item);
        break;
      case "level":
        levels.push(item);
        break;
      case "org_form":
        orgForms.push(item);
        break;
      case "deliverable":
        if (doc.sortOrder <= 5) {
          basicDeliverables.push(item);
        } else {
          extendedDeliverables.push(item);
        }
        break;
    }
  }

  const deliverableTypes: DeliverableGroup[] = [
    { group: "基础稳态产出物池", items: basicDeliverables },
    { group: "高作品感扩展产出物池", items: extendedDeliverables },
  ];

  const courseDirections: { name: string; value: string }[] = [];
  const imageStyles: { name: string; value: string }[] = [];
  const coreNeedsTags: string[] = [];
  const constraintsTags: string[] = [];

  for (const preset of presets) {
    switch (preset.category) {
      case "course_direction":
        courseDirections.push({ name: preset.name, value: preset.value });
        break;
      case "image_style":
        imageStyles.push({ name: preset.name, value: preset.value });
        break;
      case "core_needs_tag":
        coreNeedsTags.push(preset.name);
        break;
      case "constraints_tag":
        constraintsTags.push(preset.name);
        break;
    }
  }

  return NextResponse.json({
    data: {
      ageRanges,
      levels,
      orgForms,
      deliverableTypes,
      courseDirections,
      imageStyles,
      coreNeedsTags,
      constraintsTags,
    },
  });
}
