import { generateObject } from "ai";
import { z } from "zod";
import { solar } from "@/app/lib/solar";

// S6: 타이머 종료 시 "다 못 끝냈어요"를 눌렀을 때 몇 분 더 줄지 판단한다. suggest_break과 같은
// 패턴 - 고정 계단이 아니라 모델이 estimatedMinutes·extendCount를 보고 직접 분 단위를 정한다.
const timerExtendSchema = z.object({
  extendMinutes: z.number().int().min(1).max(25),
  reason: z.string().describe("연장 시간을 이렇게 정한 이유를 사용자에게 보여줄 한 줄 문장"),
});

export async function POST(request) {
  const { currentStep, extendCount = 0 } = await request.json();

  const system =
    "ADHD 사용자가 타이머가 끝났는데 스텝을 아직 다 못 끝냈다고 알려온 상황이다. " +
    "몇 분 더 시간을 줄지 1~25 사이 정수로 직접 판단해라. " +
    "이미 몇 번 연장했었는지(extendCount)를 참고해라 - 이미 여러 번 연장했다면 매번 originalEstimatedMinutes만큼 " +
    "길게 주지 말고 점점 짧게 줄여서, 마무리에 가까워지도록 유도해라. " +
    "reason은 사용자에게 그대로 보여줄 문장이니 extendCount·estimatedMinutes 같은 변수 이름이나 " +
    "개발 용어를 쓰지 말고 짧고 자연스러운 한국어 말투로 써라. " +
    '결과는 반드시 다음 JSON 형식으로만 응답한다(다른 필드 추가 금지): {"extendMinutes": number, "reason": string}';

  const prompt = JSON.stringify({
    stepTitle: currentStep?.title,
    originalEstimatedMinutes: currentStep?.estimatedMinutes,
    extendCount,
  });

  const { object } = await generateObject({
    model: solar,
    schema: timerExtendSchema,
    system,
    prompt,
  });

  return Response.json(object);
}
