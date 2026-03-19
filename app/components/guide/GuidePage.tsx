"use client";

import { useState, useMemo } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import TeacherGuide, { TEACHER_SECTIONS } from "./TeacherGuide";
import RdManagerGuide, { RD_MANAGER_SECTIONS } from "./RdManagerGuide";
import GuideToc from "./GuideToc";
import { useGuideActiveSection } from "./useGuideActiveSection";

interface GuidePageProps {
  userRole: string;
}

export default function GuidePage({ userRole }: GuidePageProps) {
  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";

  const [activeTab, setActiveTab] = useState<"teacher" | "rd_manager">(
    isTeacher ? "teacher" : "rd_manager"
  );

  const currentSections = activeTab === "teacher" ? TEACHER_SECTIONS : RD_MANAGER_SECTIONS;
  const sectionIds = useMemo(() => currentSections.map((s) => s.id), [currentSections]);
  const activeId = useGuideActiveSection(sectionIds);

  return (
    <>
      <SetTopBar title="使用指南" />
      <div className="guide-page">
        <GuideToc sections={currentSections} activeId={activeId} />

        <div className="guide-main">
          {isAdmin && (
            <div className="guide-page__tabs">
              <button
                className={`guide-page__tab${activeTab === "teacher" ? " guide-page__tab--active" : ""}`}
                onClick={() => setActiveTab("teacher")}
              >
                教师版
              </button>
              <button
                className={`guide-page__tab${activeTab === "rd_manager" ? " guide-page__tab--active" : ""}`}
                onClick={() => setActiveTab("rd_manager")}
              >
                教学主管版
              </button>
            </div>
          )}

          {activeTab === "teacher" ? <TeacherGuide /> : <RdManagerGuide />}
        </div>
      </div>
    </>
  );
}
