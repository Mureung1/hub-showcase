import { readJson, writeJson } from "./jsonStore";
import { dataPath } from "./paths";

export interface ChatMessage {
  id: string;
  from: "user" | "agent";
  text: string;
  created_at: string;
}

function messagesFile(stepId: number | string): string {
  return dataPath("messages", `${stepId}.json`);
}

export async function getMessages(stepId: number | string): Promise<ChatMessage[]> {
  try {
    return await readJson<ChatMessage[]>(messagesFile(stepId));
  } catch {
    return [];
  }
}

export async function appendMessages(
  stepId: number | string,
  newMessages: ChatMessage[]
): Promise<ChatMessage[]> {
  const existing = await getMessages(stepId);
  const updated = [...existing, ...newMessages];
  await writeJson(messagesFile(stepId), updated);
  return updated;
}
