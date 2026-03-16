"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DirectionInputForm from "./DirectionInputForm";
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
  currentDirectionVersionId: string | null;
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

  // 输入表单数据
  const [formData, setFormData] = useState({
    title: projectData?.title ?? "",
    targetAudience: projectData?.targetAudience ?? "",
    courseDirection: projectData?.courseDirection ?? "",
    ageRange: projectData?.ageRange ?? "",
    level: projectData?.level ?? "",
    lessonCount: projectData?.lessonCount ?? 4,
    coreDeliverable: projectData?.coreDeliverable ?? "",
    roughFramework: projectData?.roughFramework ?? "",
    coreNeeds: projectData?.coreNeeds ?? "",
    constraints: projectData?.constraints ?? "",
  });

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      // 如果没有项目，先创建
      let pid = projectId;
      if (!pid) {
        const createRes = await fetch("/api/course-rnd/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) { setError(createJson.error); return; }
        pid = createJson.data.id;
        setProjectId(pid);
        // 更新 URL（不刷新页面）
        window.history.replaceState(null, "", `/course-rnd/${pid}`);
      } else {
        // 自动保存草稿
        await fetch(`/api/course-rnd/projects/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      // 生成框架
      const res = await fetch(`/api/course-rnd/projects/${pid}/generate-framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
    } catch (e) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmFramework() {
    if (!projectId) return;
    setLoading(true);
    try {
      await fetch(`/api/course-rnd/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "workbench" }),
      });
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
          loading={loading}
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
