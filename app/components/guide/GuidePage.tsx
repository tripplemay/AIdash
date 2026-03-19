"use client";

import { useState } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import TeacherGuide from "./TeacherGuide";
import RdManagerGuide from "./RdManagerGuide";

interface GuidePageProps {
  userRole: string;
}

export default function GuidePage({ userRole }: GuidePageProps) {
  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";

  // admin can switch between guides; others see their own
  const [activeTab, setActiveTab] = useState<"teacher" | "rd_manager">(
    isTeacher ? "teacher" : "rd_manager"
  );

  return (
    <>
      <SetTopBar title="使用指南" />
      <div className="guide-page">
        {/* Tab switcher for admin */}
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

        {/* Content */}
        {activeTab === "teacher" ? <TeacherGuide /> : <RdManagerGuide />}
      </div>
    </>
  );
}
