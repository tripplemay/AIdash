"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DirectionInputForm, { type FormData } from "./DirectionInputForm";
import { ConfirmModal } from "./CourseRndModal";
import FrameworkResultPanel from "./FrameworkResultPanel";
import Link from "next/link";
import { SetTopBar } from "@/components/TopBarContext";

interface RecentProject {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
}

interface DirectionVersion {
  id: string;
  versionNo: number;
  summary: string | null;
  frameworkJson: string | null;
}

interface ProjectData {
  id: string;
  title: string;
  status: string;
  targetAudience: string | null;
  courseDirection: string | null;
  ageRange: string | null;
  level: string | null;
  lessonCount: number | null;
  coreDeliverable: string | null;
  roughFramework: string | null;
  coreNeeds: string | null;
  constraints: string | null;
  orgForm: string | null;
  deliverableType: string | null;
  deliverableName: string | null;
  imageStyle: string | null;
  imageStylePrompt: string | null;
  currentDirectionVersionId: string | null;
  coverUrl: string | null;
  directionVersions: DirectionVersion[];
}

interface Props {
  projectData?: ProjectData;
  recentProjects?: RecentProject[];
}

export default function CourseRndDirectionPage({ projectData, recentProjects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projectData?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // 框架结果
  const currentVersion = projectData?.directionVersions?.[0];
  const [framework, setFramework] = useState<{
    summary: string;
    lessons: Array<{ lessonNo: number; title: string; overview: string }>;
    versionId: string;
  } | null>(() => {
    if (currentVersion?.frameworkJson && currentVersion?.summary) {
      try {
        return {
          summary: currentVersion.summary,
          lessons: JSON.parse(currentVersion.frameworkJson),
          versionId: currentVersion.id,
        };
      } catch { return null; }
    }
    return null;
  });

  // 框架修改
  const [revisingFramework, setRevisingFramework] = useState(false);

  // 封面
  const [coverUrl, setCoverUrl] = useState<string | null>(projectData?.coverUrl ?? null);
  const [generatingCover, setGeneratingCover] = useState(false);

  // 输入表单数据
  const [formData, setFormData] = useState<FormData>({
    title: projectData?.title ?? "",
    courseDirection: projectData?.courseDirection ?? "",
    courseDirectionPreset: "",
    ageRange: projectData?.ageRange ?? "",
    level: projectData?.level ?? "",
    orgForm: projectData?.orgForm ?? "",
    lessonCount: projectData?.lessonCount ?? 4,
    deliverableType: projectData?.deliverableType ?? "",
    deliverableName: projectData?.deliverableName ?? projectData?.coreDeliverable ?? "",
    imageStyle: projectData?.imageStyle ?? "",
    imageStylePrompt: projectData?.imageStylePrompt ?? "",
    roughFramework: projectData?.roughFramework ?? "",
    coreNeedsTags: [],
    coreNeedsText: projectData?.coreNeeds ?? "",
    constraintsTags: [],
    constraintsText: projectData?.constraints ?? "",
  });

  async function generateCoverAsync(pid: string) {
    if (!pid) return;
    setGeneratingCover(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${pid}/generate-cover`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setCoverUrl(json.data.coverUrl);
      }
    } catch {
      // Non-blocking — cover generation failure should not interrupt the user
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      // 将表单数据映射为 API 字段
      const coreNeeds = [
        ...formData.coreNeedsTags,
        ...(formData.coreNeedsText ? [formData.coreNeedsText] : []),
      ].join("；");
      const constraints = [
        ...formData.constraintsTags,
        ...(formData.constraintsText ? [formData.constraintsText] : []),
      ].join("；");
      const apiPayload = {
        title: formData.title,
        courseDirection: formData.courseDirection,
        ageRange: formData.ageRange,
        level: formData.level,
        orgForm: formData.orgForm,
        lessonCount: formData.lessonCount,
        deliverableType: formData.deliverableType,
        deliverableName: formData.deliverableName,
        coreDeliverable: formData.deliverableName,
        imageStyle: formData.imageStyle,
        imageStylePrompt: formData.imageStylePrompt,
        roughFramework: formData.roughFramework,
        coreNeeds,
        constraints,
      };

      // 如果没有项目，先创建
      let pid = projectId;
      if (!pid) {
        const createRes = await fetch("/api/course-rnd/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) { setError(createJson.error); return; }
        pid = createJson.data.id;
        setProjectId(pid);
        window.history.replaceState(null, "", `/course-rnd/${pid}`);
      } else {
        await fetch(`/api/course-rnd/projects/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        });
      }

      // 生成框架
      const res = await fetch(`/api/course-rnd/projects/${pid}/generate-framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "生成失败");
        return;
      }

      setFramework({
        summary: json.data.summary,
        lessons: json.data.framework,
        versionId: json.data.directionVersionId,
      });

      // 仅在没有封面时自动生成（重新生成/修改框架不重复生成）
      if (!coverUrl) generateCoverAsync(pid);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleReviseFramework(feedback: string) {
    if (!projectId) return;
    setRevisingFramework(true);
    setError("");

    try {
      const res = await fetch(`/api/course-rnd/projects/${projectId}/revise-framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "修改失败");
        return;
      }

      setFramework({
        summary: json.data.summary,
        lessons: json.data.framework,
        versionId: json.data.directionVersionId,
      });
    } catch {
      setError("网络错误，请重试");
    } finally {
      setRevisingFramework(false);
    }
  }

  async function handleGenerateCover(customPrompt?: string) {
    if (!projectId) return;
    setGeneratingCover(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${projectId}/generate-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt }),
      });
      const json = await res.json();
      if (res.ok) {
        setCoverUrl(json.data.coverUrl);
      } else {
        setError(json.error ?? "封面生成失败");
      }
    } catch {
      setError("封面生成失败，请重试");
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleConfirmFramework() {
    if (!projectId) return;
    setLoading(true);
    try {
      // 1. 更新状态
      await fetch(`/api/course-rnd/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "workbench" }),
      });
      // 2. 创建方案骨架（空课次卡片），这样进入工作台直接看到课次列表
      await fetch(`/api/course-rnd/projects/${projectId}/generate-plan`, { method: "POST" });
      router.push(`/course-rnd/${projectId}/workbench`);
    } catch {
      setError("操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    if (!projectId) return;
    await fetch(`/api/course-rnd/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" }),
    });
    router.push("/course-rnd");
  }

  async function handleArchive() {
    if (!projectId) return;
    setShowArchiveConfirm(false);
    await fetch(`/api/course-rnd/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    router.push("/course-rnd");
  }

  return (
    <div>
      <SetTopBar
        breadcrumb="研发进度"
        title={projectId ? "课程方向确认" : "创建新课程"}
        actions={recentProjects && recentProjects.length > 0 && !projectId ? (
          <>
            {recentProjects.slice(0, 3).map(p => (
              <Link key={p.id} href={`/course-rnd/${p.id}`} className="btn btn--soft btn--sm">{p.title}</Link>
            ))}
          </>
        ) : undefined}
      />

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      {/* 输入表单 */}
      <DirectionInputForm
        formData={formData}
        onChange={setFormData}
        onGenerate={handleGenerate}
        loading={loading}
      />

      {/* 框架结果 */}
      {framework && (
        <FrameworkResultPanel
          summary={framework.summary}
          lessons={framework.lessons}
          onConfirm={handleConfirmFramework}
          onPause={handlePause}
          onArchive={() => setShowArchiveConfirm(true)}
          onRegenerate={handleGenerate}
          onReviseFramework={handleReviseFramework}
          loading={loading}
          revisingFramework={revisingFramework}
          coverUrl={coverUrl}
          onRegenerateCover={handleGenerateCover}
          generatingCover={generatingCover}
        />
      )}

      {showArchiveConfirm && (
        <ConfirmModal
          title="确认废弃"
          message="确认废弃此项目？废弃后可在研发进度管理中查看但无法继续编辑。"
          confirmLabel="确认废弃"
          danger
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}
    </div>
  );
}
