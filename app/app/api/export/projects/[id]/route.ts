export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";

/** GET /api/export/projects/:id — full project detail with generation config snapshot */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      ageRange: true,
      level: true,
      orgForm: true,
      deliverableType: true,
      deliverableName: true,
      lessonCount: true,
      courseDirection: true,
      targetAudience: true,
      coreNeeds: true,
      constraints: true,
      roughFramework: true,
      imageStyle: true,
      imageStylePrompt: true,
      coverUrl: true,
      currentDirectionVersionId: true,
      currentPlanVersionId: true,
      createdAt: true,
      updatedAt: true,
      publishRecords: {
        select: { createdAt: true, packageTitle: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Direction version
  let directionVersion = null;
  if (project.currentDirectionVersionId) {
    const dv = await prisma.courseRndDirectionVersion.findUnique({
      where: { id: project.currentDirectionVersionId },
      select: { summary: true, frameworkJson: true },
    });
    directionVersion = dv;
  }

  // Plan version + lesson drafts
  let lessonDrafts: Array<Record<string, unknown>> = [];
  if (project.currentPlanVersionId) {
    const drafts = await prisma.courseRndLessonDraft.findMany({
      where: { planVersionId: project.currentPlanVersionId },
      select: {
        lessonNo: true,
        title: true,
        overview: true,
        lastFeedback: true,
        updatedAt: true,
      },
      orderBy: { lessonNo: "asc" },
    });
    lessonDrafts = drafts.map((d) => ({
      lessonNo: d.lessonNo,
      title: d.title,
      overview: d.overview,
      lastFeedback: d.lastFeedback,
      updatedAt: d.updatedAt,
    }));
  }

  // Generation config snapshot
  const generationConfigSnapshot = await buildGenerationConfigSnapshot(project);

  // Validation result (latest)
  let validationResult = null;
  const validationLog = await prisma.courseRndAiCallLog.findFirst({
    where: { projectId: id, actionType: "validate_lesson" },
    orderBy: { createdAt: "desc" },
    select: { messageLog: true, createdAt: true },
  });
  if (validationLog?.messageLog) {
    try {
      validationResult = {
        ...JSON.parse(validationLog.messageLog),
        validatedAt: validationLog.createdAt,
      };
    } catch {
      // ignore parse error
    }
  }

  return NextResponse.json({
    data: {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        ageRange: project.ageRange,
        level: project.level,
        orgForm: project.orgForm,
        deliverableType: project.deliverableType,
        deliverableName: project.deliverableName,
        lessonCount: project.lessonCount,
        courseDirection: project.courseDirection,
        targetAudience: project.targetAudience,
        coreNeeds: project.coreNeeds,
        constraints: project.constraints,
        imageStyle: project.imageStyle,
        imageStylePrompt: project.imageStylePrompt,
        coverUrl: project.coverUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      generationConfigSnapshot,
      directionVersion,
      lessonDrafts,
      validationResult,
      publishRecords: project.publishRecords.map((r) => ({
        publishedAt: r.createdAt,
        packageTitle: r.packageTitle,
      })),
    },
  });
}

// ─── Build generation config snapshot ───

async function buildGenerationConfigSnapshot(project: {
  ageRange: string | null;
  level: string | null;
  orgForm: string | null;
  deliverableType: string | null;
}) {
  // Map project attributes to baseline keys
  const ageKey = project.ageRange ? mapAgeRangeToKey(project.ageRange) : null;
  const levelKey = project.level ?? null;
  const orgFormKey = project.orgForm ?? null;
  const deliverableKey = project.deliverableType ?? null;

  // Get matched baselines with version numbers
  const baselineKeys: Array<{ type: string; key: string }> = [
    { type: "general", key: "general" },
    { type: "matrix", key: "matrix" },
  ];
  if (ageKey) baselineKeys.push({ type: "age", key: ageKey });
  if (levelKey) baselineKeys.push({ type: "level", key: levelKey });
  if (orgFormKey) baselineKeys.push({ type: "org_form", key: orgFormKey });
  if (deliverableKey) baselineKeys.push({ type: "deliverable", key: deliverableKey });

  const baselines = await prisma.baselineDoc.findMany({
    where: {
      OR: baselineKeys.map((b) => ({ type: b.type, key: b.key })),
    },
    select: {
      id: true, type: true, key: true, label: true,
      versions: {
        select: { versionNo: true },
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
  });

  const baselineVersions: Record<string, number> = {};
  const matchedBaselines: Array<{ type: string; key: string; label: string }> = [];
  for (const b of baselines) {
    const versionNo = b.versions[0]?.versionNo ?? 1;
    const mapKey = b.type === "general" || b.type === "matrix" ? b.type : `${b.type}_${b.key}`;
    baselineVersions[mapKey] = versionNo;
    matchedBaselines.push({ type: b.type, key: b.key, label: b.label });
  }

  // Get prompt template versions
  const templates = await prisma.promptTemplate.findMany({
    select: {
      actionKey: true, actionLabel: true,
      versions: {
        select: { versionNo: true },
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
  });

  const promptTemplateVersions: Record<string, number> = {};
  for (const t of templates) {
    promptTemplateVersions[t.actionKey] = t.versions[0]?.versionNo ?? 1;
  }

  // Get action configs (provider + model)
  const actionConfigs = await prisma.aiActionConfig.findMany({
    select: {
      actionKey: true,
      actionLabel: true,
      modelName: true,
      provider: { select: { name: true } },
    },
  });

  // Build dimension labels
  const dimensionLabels: Record<string, string> = {};
  for (const b of matchedBaselines) {
    if (b.type === "age") dimensionLabels.ageLabel = b.label;
    if (b.type === "level") dimensionLabels.levelLabel = b.label;
    if (b.type === "org_form") dimensionLabels.orgFormLabel = b.label;
    if (b.type === "deliverable") dimensionLabels.deliverableLabel = b.label;
  }

  return {
    dimensions: {
      ageKey,
      ageLabel: dimensionLabels.ageLabel ?? null,
      levelKey,
      levelLabel: dimensionLabels.levelLabel ?? null,
      orgFormKey,
      orgFormLabel: dimensionLabels.orgFormLabel ?? null,
      deliverableKey,
      deliverableLabel: dimensionLabels.deliverableLabel ?? null,
    },
    baselineVersions,
    promptTemplateVersions,
    actionConfigs: actionConfigs.map((a) => ({
      actionKey: a.actionKey,
      actionLabel: a.actionLabel,
      providerName: a.provider?.name ?? null,
      modelName: a.modelName,
    })),
  };
}

function mapAgeRangeToKey(ageRange: string): string {
  const map: Record<string, string> = {
    "6-7": "A1", "8-9": "A2", "10-12": "A3", "13-15": "A4",
  };
  return map[ageRange] ?? ageRange;
}
