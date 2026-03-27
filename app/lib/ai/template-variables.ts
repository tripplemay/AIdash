/**
 * Prompt 模板变量元数据 — 供管理后台侧边栏展示可用变量
 */

export interface TemplateVariable {
  key: string;
  group: string;
  description: string;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  // ── 项目信息 ──
  { key: "项目标题", group: "项目信息", description: "项目标题" },
  { key: "课程方向", group: "项目信息", description: "课程方向" },
  { key: "目标年龄段", group: "项目信息", description: "目标年龄段" },
  { key: "年龄段标签", group: "项目信息", description: "年龄段标签" },
  { key: "目标级别", group: "项目信息", description: "目标级别" },
  { key: "级别标签", group: "项目信息", description: "级别标签" },
  { key: "课程组织形态", group: "项目信息", description: "课程组织形态" },
  { key: "组织形态标签", group: "项目信息", description: "组织形态标签" },
  { key: "产出物形态", group: "项目信息", description: "产出物形态" },
  { key: "产出物标签", group: "项目信息", description: "产出物标签" },
  { key: "产出物名称", group: "项目信息", description: "产出物名称" },
  { key: "预计课次数", group: "项目信息", description: "预计课次数" },
  { key: "图片风格描述", group: "项目信息", description: "图片风格描述" },
  { key: "大致框架", group: "项目信息", description: "大致框架" },
  { key: "核心诉求", group: "项目信息", description: "核心诉求" },
  { key: "补充约束", group: "项目信息", description: "补充约束" },

  // ── 基线 ──
  { key: "通用基线", group: "基线", description: "通用基线" },
  { key: "年龄段基线", group: "基线", description: "年龄段基线" },
  { key: "级别基线", group: "基线", description: "级别基线" },
  { key: "组织形态基线", group: "基线", description: "组织形态基线" },
  { key: "产出物基线", group: "基线", description: "产出物基线" },
  { key: "分层规则矩阵", group: "基线", description: "分层规则矩阵" },
  { key: "课件基线", group: "基线", description: "课件生成通用基线" },

  // ── 上下文 ──
  { key: "课程整体摘要", group: "上下文", description: "框架阶段的课程整体摘要" },
  { key: "当前课次号", group: "上下文", description: "当前课次号" },
  { key: "当前课次标题", group: "上下文", description: "当前课次标题" },
  { key: "全部课次概览", group: "上下文", description: "全部课次概览" },
  { key: "当前课次方案", group: "上下文", description: "当前课次方案" },
  { key: "修改意见", group: "上下文", description: "修改意见" },
  { key: "目标板块", group: "上下文", description: "目标板块" },

  // ── 课件生成 ──
  { key: "课次完整内容", group: "课件生成", description: "当前课次的完整 contentData JSON" },
  { key: "主题配置", group: "课件生成", description: "选中的 PPT 主题配置信息" },
] as const;

export type TemplateVariableKey = (typeof TEMPLATE_VARIABLES)[number]["key"];
