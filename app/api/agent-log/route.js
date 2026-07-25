import { logStruggle } from "@/app/lib/agentlog";

// 화면(수락/거절)에서 결정이 난 뒤 호출: 그 결정 하나를 AgentLog에 기록한다.
export async function POST(request) {
  const { taskCategory, reasonChip, proposedTool, reason, accepted } = await request.json();

  const created = await logStruggle({
    timestamp: new Date(),
    task_category: taskCategory,
    reason_chip: reasonChip,
    proposed_tool: proposedTool,
    proposed_reason: reason,
    accepted,
  });

  return Response.json({ id: created.id });
}
