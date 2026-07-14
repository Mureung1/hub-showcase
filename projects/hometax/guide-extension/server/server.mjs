// 홈택스 AI 가이드 확장 프로그램용 최소 프록시 서버.
// 역할: Claude API 키를 서버에만 보관하고, 확장 프로그램에서 온 "지금 화면에 보이는 클릭 가능한 요소 목록"과
// 사용자의 목표를 받아 "다음에 뭘 눌러야 하는지" LLM이 고른 결과를 돌려준다.
// 상태 저장/로깅 없음 (완전 stateless relay). 표 내용 등 민감정보는 애초에 전송받지 않는다(건수만 받음).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';
import { appendFile } from 'node:fs/promises';

const USAGE_LOG_PATH = new URL('./usage-log.jsonl', import.meta.url);

// 프롬프트/응답 내용은 절대 남기지 않고, 토큰 수치만 한 줄씩 추가한다 (PII 없음).
async function logUsage(usage) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  });
  await appendFile(USAGE_LOG_PATH, line + '\n', 'utf-8');
}

const PORT = process.env.PORT || 4000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[explain-proxy] ANTHROPIC_API_KEY가 설정되지 않았습니다 — .env를 확인하세요.');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// structured outputs용 응답 스키마 — 서버(Anthropic 쪽)가 이 모양의 JSON만 생성하도록 강제한다.
// 프롬프트로 "JSON으로 답해줘"라고 부탁하는 것과 달리, 형식이 API 차원에서 보장된다.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    index: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    label: { type: 'string' },
    done: { type: 'boolean' },
    goalAchieved: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['index', 'label', 'done', 'goalAchieved', 'message'],
  additionalProperties: false,
};

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/next-step', async (req, res) => {
  const { goal, currentUrl, resultRowCount, elements, history, screenChanged, newElementTexts } = req.body || {};

  if (!goal || !Array.isArray(elements)) {
    return res.status(400).json({ error: 'goal, elements가 필요합니다.' });
  }

  // TEMP DEBUG — 실제로 어떤 요소 목록이 오는지 확인하려고 잠깐 추가함 (PII 아님, 버튼 라벨/역할뿐).
  console.log(`\n[DEBUG] goal="${goal}" url=${currentUrl} rowCount=${resultRowCount} screenChanged=${screenChanged} elements(${elements.length}):`);
  console.log(JSON.stringify(elements, null, 1));
  console.log(`[DEBUG] history:`, JSON.stringify(history), 'newElementTexts:', JSON.stringify(newElementTexts));

  const prompt = buildPrompt({ goal, currentUrl, resultRowCount, elements, history, screenChanged, newElementTexts });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      // 상한일 뿐 실제 생성된 토큰만 과금됨 — 400은 한글 label+message가 잘리는 사고가 실측으로 확인돼 여유 있게 올림
      max_tokens: 1000,
      output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    console.log(`[explain-proxy] 토큰 사용량 — 입력 ${message.usage.input_tokens} / 출력 ${message.usage.output_tokens}`);
    logUsage(message.usage).catch((err) => console.error('[explain-proxy] 사용량 로그 기록 실패:', err.message));

    // 길이 상한에 걸려 잘린 응답은 JSON이 깨져 있음 — "완료"로 위장하지 말고 정직한 안내로 응답한다.
    if (message.stop_reason === 'max_tokens') {
      console.warn('[explain-proxy] 응답이 max_tokens 상한에서 잘렸습니다 — 잘린 내용은 버리고 안내 메시지로 대체');
      return res.json({
        index: null,
        done: false,
        message: 'AI 답변이 길이 제한에 걸려 중간에 잘렸어요. 가이드를 다시 시작해주세요.',
      });
    }

    res.json(parseJsonResponse(raw));
  } catch (err) {
    console.error('[explain-proxy] Claude API 호출 실패:', err.message);
    res.status(502).json({
      index: null,
      done: true,
      message: 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

export function buildPrompt({ goal, currentUrl, resultRowCount, elements, history, screenChanged, newElementTexts }) {
  const elementLines = elements
    .map((e) => `${e.index}: "${e.text}" (${e.role}${e.offscreen ? ', 지금 화면 밖 — 스크롤해야 보임' : ''})`)
    .join('\n');
  // history 항목은 옛 형식(문자열)과 새 형식({label, screenChanged}) 둘 다 지원 — count-tokens.mjs 등 기존 호출부 호환.
  const renderHistoryItem = (h) => {
    if (typeof h === 'string') return h;
    if (h.screenChanged === true) return `${h.label} (클릭 후 화면 바뀜)`;
    if (h.screenChanged === false) return `${h.label} (클릭해도 화면 그대로 — 효과 없었음)`;
    return h.label;
  };
  const historyLines = history && history.length ? history.map(renderHistoryItem).join(' → ') : '(없음)';
  const last = history && history.length ? history[history.length - 1] : null;
  const lastAction = last ? (typeof last === 'string' ? last : last.label) : null;
  const screenChangeLine =
    screenChanged === true
      ? '직전 클릭 후 화면이 바뀌었습니다.'
      : screenChanged === false
        ? '직전 클릭 후 화면이 그대로입니다 (클릭 효과 없음).'
        : '(첫 턴 — 화면 변화 비교 대상 없음)';
  const newElementsLine =
    newElementTexts && newElementTexts.length
      ? `이번 화면에 새로 나타난 요소: ${newElementTexts.map((t) => `"${t}"`).join(', ')}`
      : '';

  return `당신은 대한민국 국세청 홈택스(hometax.go.kr) 사용을 돕는 가이드입니다.
사용자는 화면 위에서 강조 표시된 버튼을 직접 클릭합니다 — 당신은 어디를 강조할지만 고릅니다.

사용자의 목표: "${goal}"
현재 페이지 URL: ${currentUrl}
현재 화면에 표 형태로 표시된 결과 행 수: ${resultRowCount}
지금까지 사용자가 클릭한 단계: ${historyLines}
가장 최근에 클릭한 단계: ${lastAction ? `"${lastAction}"` : '(없음)'}
직전 클릭의 화면 변화: ${screenChangeLine}
${newElementsLine}

판단 규칙:
- 직전 클릭 후 화면이 그대로라면(효과 없음), 직전과 같은 요소를 다시 고르지 마세요. 새로 나타난 요소가 있으면 그것부터 검토하세요.
- 클릭 이력에서 화면이 두 번 연속 바뀌지 않았다면 진전이 없는 것입니다 — done을 true로 하고 message에 왜 더 진행할 수 없는지 설명하세요.

현재 화면에서 클릭 가능한 요소 목록(인덱스: "텍스트" (역할)):
${elementLines}

이 목록 중에서 사용자의 목표를 달성하기 위해 다음에 클릭해야 할 요소 하나를 고르세요.
"지금 화면 밖" 표시가 있는 요소도 정상적으로 고를 수 있습니다 — 확장 프로그램이 자동으로 스크롤해서 보여줍니다.

**완료(done) 판단을 적극적으로 하세요 — 이게 가장 중요합니다.** 다음 중 하나라도 해당하면 done을 true로 하고,
새로 요소를 고르지 마세요:
- 가장 최근 클릭이 "조회", "검색", "확인" 등 목표 달성에 필요한 마지막 동작으로 보이고, 그 결과 화면(현재 결과 행 수 포함)이 이미 나와 있다.
- 목표를 이미 이룬 것으로 보인다(더 클릭해도 새로운 진전이 없다).
- 목록에 목표와 명확히 관련된 다음 단계가 안 보이고, 있는 건 전부 로그아웃/즐겨찾기/새로고침/인쇄/뒤로가기처럼 목표와 무관한 것들뿐이다.
done이 true면 message에 결과(예: "환급금 조회 결과 0건" 등, resultRowCount 활용)나 완료 사실을 사용자에게 알기 쉽게 설명하세요.

done이 false일 때만 index를 고르세요. 목표와 명백히 무관한 요소(로그아웃, 즐겨찾기, 새로고침, 언어 변경 등)는 절대 고르지 마세요.
그런 무관한 요소밖에 없다면 index를 null로 하고 done을 true로 하세요.

반드시 아래 JSON 형식으로만, 다른 설명 없이 응답하세요. label은 한 문장, message는 최대 두 문장으로 짧게 쓰세요:
{"index": <숫자 또는 null>, "label": "<사용자에게 보여줄 클릭 안내 한 문장, 예: '전체메뉴를 클릭하세요'>", "done": <true 또는 false>, "message": "<사용자에게 보여줄 한국어 메시지 - 다음 행동 안내 또는 완료/결과 설명>"}`;
}

function parseJsonResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // 아래 폴백으로 진행
      }
    }
    return { index: null, done: true, message: raw || 'AI 응답을 이해하지 못했습니다.' };
  }
}

// count-tokens.mjs가 buildPrompt()만 재사용하려고 이 파일을 import할 때 서버가 같이 뜨는 걸 막음
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`[explain-proxy] listening on http://localhost:${PORT}`);
  });
}
