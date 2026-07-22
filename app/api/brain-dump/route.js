import { generateObject } from "ai";
import { z } from "zod";
import { solar } from "@/app/lib/solar";

const brainDumpSchema = z.object({
  microsteps: z
    .array(
      z.object({
        title: z.string().describe("25분 이내에 끝낼 수 있는 구체적인 행동 한 문장"),
        estimatedMinutes: z.number().int().min(1).max(25),
      })
    )
    .min(1)
    .describe("입력을 실행 가능한 순서대로 쪼갠 마이크로 스텝 목록"),
});

export async function POST(request) {
  const { text } = await request.json();

  if (!text || text.trim() === "") {
    return Response.json({ error: "text가 비어 있어요" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: solar,
    schema: brainDumpSchema,
    system:
      "ADHD 사용자가 두서없이 적은 할 일을 25분 이내에 끝낼 수 있는 마이크로 스텝들로 쪼개는 어시스턴트다. " +
      "각 스텝은 바로 실행할 수 있을 만큼 구체적이어야 하고, 실행 순서대로 나열한다.",
    prompt: text,
  });

  return Response.json(object);
}
