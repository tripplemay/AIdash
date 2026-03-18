export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import {
  getGeneralChatSystemPrompt,
  getCourseDesignChatSystemPrompt,
} from "@/lib/ai/chat-prompts";

const ALLOWED_ROLES = [ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN] as const;

/** POST /api/chat/conversations/[id]/messages — send message with SSE streaming */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const { id: conversationId } = await params;

  const body = await request.json().catch(() => ({}));
  const userMessage: string = body.message ?? "";

  if (!userMessage.trim()) {
    return new Response(
      JSON.stringify({ error: "消息不能为空" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Load conversation and verify ownership
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true, mode: true },
  });

  if (!conversation) {
    return new Response(
      JSON.stringify({ error: "对话不存在" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  if (conversation.userId !== userId) {
    return forbiddenResponse();
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  // Load all messages for context
  const allMessages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Build system prompt based on mode
  let systemPrompt: string;
  if (conversation.mode === "course_design") {
    systemPrompt = await getCourseDesignChatSystemPrompt();
  } else {
    systemPrompt = getGeneralChatSystemPrompt();
  }

  // Get provider and model
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("chat"));
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "AI 服务未配置",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build messages array for API
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...allMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // SSE stream response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;

        if (provider.chatStream) {
          const generator = provider.chatStream({
            systemPrompt,
            userMessage,
            model,
            messages: apiMessages,
          });

          while (true) {
            const iterResult = await generator.next();
            if (iterResult.done) {
              fullContent = iterResult.value.content;
              inputTokens = iterResult.value.inputTokens;
              outputTokens = iterResult.value.outputTokens;
              break;
            }
            sendEvent({ type: "delta", text: iterResult.value.text });
          }
        } else {
          // Non-streaming fallback
          const result = await provider.chat({
            systemPrompt,
            userMessage,
            model,
            messages: apiMessages,
          });
          fullContent = result.content;
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          sendEvent({ type: "delta", text: fullContent });
        }

        // Save assistant message
        await prisma.chatMessage.create({
          data: {
            conversationId,
            role: "assistant",
            content: fullContent,
          },
        });

        // Update conversation updatedAt
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Calculate cost and log
        const cost = await calculateCallCostFromDb(
          "chat",
          inputTokens,
          outputTokens,
        );

        await prisma.courseRndAiCallLog.create({
          data: {
            projectId: null,
            pageKey: "chat",
            actionType: "chat",
            modelName: model,
            inputTokens,
            outputTokens,
            estimatedCost: cost,
            userId,
            promptLog: systemPrompt,
            messageLog: userMessage,
          },
        });

        // Auto-title on first exchange (exactly 2 messages: 1 user + 1 assistant)
        const messageCount = allMessages.length; // includes the user message we just saved
        if (messageCount === 1) {
          try {
            const titleResult = await provider.chat({
              systemPrompt: "你是标题生成助手。",
              userMessage: `请用10个字以内概括以下对话的主题，只输出标题文字：\n用户：${userMessage}\nAI：${fullContent.slice(0, 200)}`,
              model,
            });
            const title = titleResult.content.trim().slice(0, 50);
            if (title) {
              await prisma.chatConversation.update({
                where: { id: conversationId },
                data: { title },
              });
              sendEvent({ type: "title", title });
            }
          } catch {
            // Title generation failure is non-critical
          }
        }

        // Send done event
        sendEvent({
          type: "done",
          tokens: { input: inputTokens, output: outputTokens },
          cost,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendEvent({ type: "error", message: `AI 调用失败：${msg}` });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
