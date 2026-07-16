import { build } from "esbuild";
import { generateMockResponse } from "../frontend/src/features/conversation/utils/generateMockResponse.js";

const bundle = await build({
  entryPoints: ["./frontend/src/features/emotion-analysis/utils/analyzeMockEmotion.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  jsx: "automatic"
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { analyzeMockEmotion } = await import(moduleUrl);

const cases = [
  { name: "normal", expectedTop: "중립", args: {} },
  {
    name: "tension-worry",
    expectedTop: "불안",
    args: {
      situationText: "발표를 망쳐서 걱정돼",
      faceSignal: "tense",
      voiceSignal: "fast",
      selectedScenario: "tension"
    }
  },
  {
    name: "tired",
    expectedTop: "슬픔",
    args: {
      situationText: "너무 피곤하고 지쳐",
      faceSignal: "downcast",
      voiceSignal: "low",
      selectedScenario: "tired"
    }
  },
  {
    name: "positive",
    expectedTop: "기쁨",
    args: {
      situationText: "시험에 합격해서 기뻐",
      faceSignal: "smile",
      voiceSignal: "bright"
    }
  }
];

for (const testCase of cases) {
  const result = analyzeMockEmotion(testCase.args);
  const total = result.scores.reduce((sum, item) => sum + item.score, 0);
  const sorted = result.scores.every(
    (item, index, list) => index === 0 || list[index - 1].score >= item.score
  );

  if (total !== 100) throw new Error(`${testCase.name}: 감정 점수 합계가 ${total}입니다.`);
  if (!sorted) throw new Error(`${testCase.name}: 감정 점수가 내림차순이 아닙니다.`);
  if (result.scores[0]?.label !== testCase.expectedTop) {
    throw new Error(`${testCase.name}: 최상위 감정이 ${result.scores[0]?.label}입니다.`);
  }
  if (result.evidence.length === 0) throw new Error(`${testCase.name}: 판단 근거가 없습니다.`);

  const response = generateMockResponse(testCase.args.situationText || "", result);
  if (!response.trim()) throw new Error(`${testCase.name}: mock 응답이 비어 있습니다.`);

  console.log(
    `PASS ${testCase.name}: total=${total}, top=${result.scores[0].label}, approach=${result.responseApproach}`
  );
}
