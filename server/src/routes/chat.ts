import { Router } from "express";
import { randomUUID } from "crypto";
import { getMessages, appendMessages, type ChatMessage } from "../utils/messages";
import { saveDocument } from "../utils/documents";
import { getStep } from "../utils/steps";
import { AGENT_PROMPTS } from "../utils/agentPrompts";
import { askAgent } from "../utils/agentChat";

const router = Router();

router.get("/:stepId/messages", async (req, res) => {
  const messages = await getMessages(req.params.stepId);
  res.json(messages);
});

router.post("/:stepId/message", async (req, res) => {
  const stepId = Number(req.params.stepId);
  const { text } = req.body as { text?: string };

  if (!Number.isInteger(stepId)) {
    return res.status(400).json({ error: "Invalid step id." });
  }
  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  const step = await getStep(stepId);
  if (!step) {
    return res.status(404).json({ error: "Step not found." });
  }

  // Which Agent handles this Step is entirely data-driven (Step.agent_name) —
  // nothing here branches on stepId itself. Steps whose agent doesn't have a
  // structured-output prompt yet (Code Generation/Refactoring — Day 12) fail
  // clearly instead of silently borrowing another agent's behavior.
  const agentConfig = AGENT_PROMPTS[step.agent_name];
  if (!agentConfig) {
    return res.status(501).json({
      error: `"${step.agent_name}"용 프롬프트가 아직 준비되지 않았습니다.`,
    });
  }

  const historyBefore = await getMessages(stepId);

  const userMessage: ChatMessage = {
    id: randomUUID(),
    from: "user",
    text,
    created_at: new Date().toISOString(),
  };
  await appendMessages(stepId, [userMessage]);

  try {
    const result = await askAgent(agentConfig, historyBefore, text);

    const agentMessage: ChatMessage = {
      id: randomUUID(),
      from: "agent",
      text: result.reply,
      created_at: new Date().toISOString(),
    };
    const messages = await appendMessages(stepId, [agentMessage]);

    let document = null;
    if (result.readyToGenerateDoc && result.document) {
      document = await saveDocument(stepId, agentConfig.docPath, result.document);
    }

    res.json({ messages, document });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
