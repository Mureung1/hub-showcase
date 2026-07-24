// 핫딜 홍보 문구 생성 — Google Gemini API (무료 티어)
//   키가 없거나 호출이 실패하면 규칙 기반 목업으로 자동 대체한다.
//   → 시연 중 네트워크·쿼터 문제가 나도 화면은 계속 동작한다.
// 규칙: 태그는 Tab1 4종(#마감할인 #노쇼발생 #우천특가 #당일한정) 안에서만 선택

const TAGS = ['#마감할인', '#노쇼발생', '#우천특가', '#당일한정'];
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash';

// server 켜질 때 한 번 찍는다 — 키를 읽었는지 바로 확인용
console.log(
  process.env.GEMINI_API_KEY
    ? `🤖 AI 문구: Gemini 사용 (모델 ${MODEL})`
    : '🤖 AI 문구: 키 없음 → 목업 사용'
);

const PROMPT = (situation) => `너는 대학가 동네 식당 사장님을 돕는 홍보 문구 작성자야.
사장님이 적은 한 줄 상황을 보고, 학생 손님을 부르는 짧은 홍보 게시글 초안을 만들어.

상황: "${situation}"

조건:
- 제목은 20자 이내, 눈에 띄되 과장하지 말 것
- 본문은 2~3문장, 부드러운 존댓말("~해요"체), 따뜻한 동네 가게 말투
- 가격을 지어내지 말 것 (사장님이 말하지 않은 숫자는 쓰지 않기)
- 태그는 반드시 다음 4개 중에서만 고르고, 1~2개만: ${TAGS.join(', ')}

아래 JSON 형식으로만 답해. 설명이나 마크다운 없이 JSON만:
{"title":"제목","body":"본문","tags":["#태그"]}`;

// ── 목업 (대체용) ───────────────────────────────────────────
const RULES = [
  {
    tag: '#우천특가',
    keywords: ['비', '우천', '장마', '폭우', '눈', '날씨', '손님이 없', '손님 없'],
    title: (m) => `비 오는 날, ${m} 어떠세요?`,
    body: (m) => `궂은 날씨에 따뜻한 ${m} 준비해뒀어요. 오늘 저녁까지만 특별한 가격으로 드릴게요. 우산 챙겨서 들러주세요 ☔`,
  },
  {
    tag: '#노쇼발생',
    keywords: ['노쇼', '예약', '취소', '단체', '안 오', '안왔'],
    title: (m) => `예약 취소로 ${m} 남았어요`,
    body: (m) => `준비해둔 ${m}가 갑자기 남게 됐어요. 버리기엔 아까워서 먼저 오시는 분들께 넉넉하게 드릴게요. 서둘러 오세요!`,
  },
  {
    tag: '#마감할인',
    keywords: ['마감', '문 닫', '재료', '남았', '남은', '떨이', '정리'],
    title: (m) => `마감 전 ${m} 정리합니다`,
    body: (m) => `오늘 준비한 ${m}, 마감 전까지 남은 만큼만 할인해서 드려요. 재료가 신선할 때 얼른 소진하려고요. 지금 오시면 딱 좋아요 🍚`,
  },
];

const FALLBACK = {
  tag: '#당일한정',
  title: (m) => `오늘만 ${m} 특별가`,
  body: (m) => `오늘 하루만 ${m}를 특별한 가격에 준비했어요. 수량이 정해져 있어서 일찍 마감될 수 있어요. 부담 없이 들러주세요 😊`,
};

function pickMenu(situation) {
  const known = ['김치찌개', '된장찌개', '부대찌개', '순두부', '제육', '불고기', '돈까스',
    '비빔밥', '국밥', '칼국수', '냉면', '백반', '떡볶이', '치킨', '피자',
    '파스타', '삼겹살', '갈비', '초밥', '라멘', '쌀국수', '샐러드', '커피', '케이크'];
  return known.find((m) => situation.includes(m)) ?? '오늘의 메뉴';
}

function mockAdCopy(situation) {
  const text = String(situation ?? '');
  const menu = pickMenu(text);
  const rule = RULES.find((r) => r.keywords.some((k) => text.includes(k))) ?? FALLBACK;
  const tags = rule.tag === '#당일한정' ? ['#당일한정'] : [rule.tag, '#당일한정'];
  return { title: rule.title(menu), body: rule.body(menu), tags, source: 'mock' };
}

// ── 실제 호출 ───────────────────────────────────────────────
export async function generateAdCopy(situation) {
  const key = process.env.GEMINI_API_KEY;

  // 키가 없으면 목업으로 (개발·시연 중에도 화면은 계속 동작)
  if (!key) {
    console.warn('GEMINI_API_KEY 없음 → 목업 문구 사용');
    return mockAdCopy(situation);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT(situation) }] }],
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // 모델이 ```json 감싸서 줄 수 있으므로 벗겨내고 파싱
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // 태그는 우리 4종 안에 있는 것만 남긴다 (모델이 엉뚱한 걸 만들어도 방어)
    const tags = (parsed.tags ?? []).filter((t) => TAGS.includes(t));

    return {
      title: String(parsed.title ?? '').slice(0, 40),
      body: String(parsed.body ?? ''),
      tags: tags.length > 0 ? tags : ['#당일한정'],
      source: 'gemini',
    };
  } catch (e) {
    // 호출 실패·파싱 실패 → 목업으로 대체 (시연 중에도 멈추지 않게)
    console.error('Gemini 호출 실패, 목업으로 대체:', e.message);
    return mockAdCopy(situation);
  }
}