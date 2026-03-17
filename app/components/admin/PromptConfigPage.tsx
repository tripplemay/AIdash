"use client";

import { useState } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import BaselineManager from "./BaselineManager";
import PromptTemplateEditor from "./PromptTemplateEditor";
import PresetManager from "./PresetManager";

const TABS = ["基线管理", "提示词模板", "预设管理"] as const;

interface Props {
  canEdit: boolean;
}

export default function PromptConfigPage({ canEdit }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <SetTopBar breadcrumb="管理后台" title="Prompt 配置" />

      {!canEdit && (
        <div className="admin-readonly-banner">
          该页面由管理员统一配置，您可以查看当前配置
        </div>
      )}

      <div className="prompt-config__tabs">
        {TABS.map((label, idx) => (
          <button
            key={label}
            className={`prompt-config__tab${idx === activeTab ? " prompt-config__tab--active" : ""}`}
            onClick={() => setActiveTab(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 0 && <BaselineManager canEdit={canEdit} />}
      {activeTab === 1 && <PromptTemplateEditor canEdit={canEdit} />}
      {activeTab === 2 && <PresetManager canEdit={canEdit} />}
    </>
  );
}
