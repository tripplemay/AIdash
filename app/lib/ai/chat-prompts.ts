import { assembleBaselines } from "./baseline-assembler";

function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekday = weekdays[now.getDay()];
  return `${year}年${month}月${day}日，星期${weekday}`;
}

const GENERAL_SYSTEM_PROMPT = `你是一个智能助手。请用中文回答用户的问题，回答要准确、清晰、有帮助。
支持使用 Markdown 格式（标题、列表、代码块、表格等）来组织回答。`;

const COURSE_DESIGN_PREAMBLE = `你是一个智能助手，同时也是 AI 辅助教学课程设计专家。

你具备以下课程设计基线知识，请在回答课程设计相关问题时参考：

对于非课程设计的问题，正常回答即可。
支持使用 Markdown 格式来组织回答。`;

export function getGeneralChatSystemPrompt(): string {
  return `当前日期：${getCurrentDateString()}\n\n${GENERAL_SYSTEM_PROMPT}`;
}

export async function getCourseDesignChatSystemPrompt(): Promise<string> {
  const baselines = await assembleBaselines({
    ageRange: null,
    level: null,
    orgForm: null,
    deliverableType: null,
  });

  const baselineContent = [
    baselines.general && `# 课程设计通用基线\n${baselines.general}`,
    baselines.matrix && `# 分层生成规则矩阵\n${baselines.matrix}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `当前日期：${getCurrentDateString()}\n\n${COURSE_DESIGN_PREAMBLE}\n\n${baselineContent}`;
}
