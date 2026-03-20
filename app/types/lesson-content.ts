export type PillColor = "blue" | "violet" | "yellow" | "green" | "default";
export type BoxVariant = "default" | "danger" | "success" | "note";

export interface TextBlock    { type: "text";      content: string }
export interface QuoteBlock   { type: "quote";     content: string }
export interface ListBlock    { type: "list";      ordered: boolean; items: string[] }
export interface TemplateBlock{ type: "template";  label?: string; content: string }
export interface QaPairBlock  { type: "qa_pair";   question: string; answer: string }

export interface BoxBlock {
  type: "box";
  pill?: { text: string; color: PillColor };
  variant?: BoxVariant;
  title?: string;
  blocks: Block[];
}

export interface GridBlock {
  type: "grid";
  cols: 2 | 3;
  items: BoxBlock[];
}

export interface ToolUsage {
  toolType: string;
  toolName: string;
  entryMethod: string;
  operator: string;
  studentAction: string;
  fallback: string;
}

export interface AccordionBlock {
  type: "accordion";
  title: string;
  time: string;
  blocks: Block[];
  toolUsage?: ToolUsage | null;
}

export type Block =
  | TextBlock | QuoteBlock | ListBlock | TemplateBlock
  | BoxBlock  | GridBlock  | AccordionBlock | QaPairBlock;

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Hero {
  tags: string[];
  title: string;
  subtitle: string;
  goal: string;
  outcome: string;
  imageUrl?: string;
}

export interface ToolPlanItem {
  toolType: string;
  recommended: string;
  alternatives: string[];
  purpose: string;
  usedInFlows: string[];
}

export interface ToolPlanSummary {
  tools: ToolPlanItem[];
  operator: string;
  studentMode: string;
  fallback: string;
}

export interface LessonContent {
  hero: Hero;
  toolPlan?: ToolPlanSummary | null;
  sections: Section[];
}
