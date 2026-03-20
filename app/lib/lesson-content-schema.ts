import { z } from "zod/v4";

// ─── Block schemas ───

const textBlock = z.object({ type: z.literal("text"), content: z.string() });
const quoteBlock = z.object({ type: z.literal("quote"), content: z.string() });
const listBlock = z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(z.string()) });
const templateBlock = z.object({ type: z.literal("template"), label: z.string().optional(), content: z.string() });
const qaPairBlock = z.object({ type: z.literal("qa_pair"), question: z.string(), answer: z.string() });

const pillColorSchema = z.enum(["blue", "violet", "yellow", "green", "default"]);
const boxVariantSchema = z.enum(["default", "danger", "success", "note"]);

// BoxBlock and GridBlock are recursive — use lazy
const boxBlock: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.literal("box"),
    pill: z.object({ text: z.string(), color: pillColorSchema }).optional(),
    variant: boxVariantSchema.optional(),
    title: z.string().optional(),
    blocks: z.array(blockSchema),
  })
);

const gridBlock: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.literal("grid"),
    cols: z.union([z.literal(2), z.literal(3)]),
    items: z.array(boxBlock),
  })
);

const toolUsageSchema = z.object({
  toolType: z.string(),
  toolName: z.string(),
  entryMethod: z.string(),
  operator: z.string(),
  studentAction: z.string(),
  fallback: z.string(),
});

const accordionBlock: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.literal("accordion"),
    title: z.string(),
    time: z.string(),
    blocks: z.array(blockSchema),
    toolUsage: toolUsageSchema.nullable().optional(),
  })
);

const blockSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    textBlock,
    quoteBlock,
    listBlock,
    templateBlock,
    qaPairBlock,
    boxBlock,
    gridBlock,
    accordionBlock,
  ])
);

// ─── Section schema ───

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});

// ─── Hero schema ───

const heroSchema = z.object({
  tags: z.array(z.string()),
  title: z.string(),
  subtitle: z.string(),
  goal: z.string(),
  outcome: z.string(),
});

// ─── ToolPlan schema ───

const toolPlanItemSchema = z.object({
  toolType: z.string(),
  recommended: z.string(),
  alternatives: z.array(z.string()),
  purpose: z.string(),
  usedInFlows: z.array(z.string()),
});

const toolPlanSchema = z.object({
  tools: z.array(toolPlanItemSchema),
  operator: z.string(),
  studentMode: z.string(),
  fallback: z.string(),
});

// ─── LessonContent schema ───

export const lessonContentSchema = z.object({
  hero: heroSchema,
  toolPlan: toolPlanSchema.nullable().optional(),
  sections: z.array(sectionSchema).min(1),
});

// ─── Validation helper ───

export function validateContentData(data: unknown): { success: true } | { success: false; errors: string[] } {
  const result = lessonContentSchema.safeParse(data);
  if (result.success) return { success: true };
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}
