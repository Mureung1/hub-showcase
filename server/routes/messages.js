import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';
import { groq } from '../groqClient.js';

const router = Router();

// 상태 격차(distance)가 이 값을 넘으면 "잠긴(submerged)" 것으로 본다.
// valence/arousal 둘 다 0~100 스케일이라 최대 거리는 약 141.4.
const SUBMERSION_THRESHOLD = 35;

async function getLatestTideCheck() {
  const { data } = await supabase
    .from('tide_checks')
    .select('valence, arousal')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function stateDistance(a, b) {
  return Math.sqrt((a.valence - b.valence) ** 2 + (a.arousal - b.arousal) ** 2);
}

function formatSummary(createdAt) {
  const time = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${time}, later than usual`;
}

// GET /api/messages — 전체 대화를 시간순으로 반환.
// 각 메시지에 저장된 상태(D_gen)와 "지금" 최신 tide check(D_recall)를 비교해서
// 격차가 크면 submerged: true로 표시한다. tide check가 아직 없으면 비교할 수 없으니
// 아무것도 잠그지 않는다.
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const currentState = await getLatestTideCheck();

  const withSubmersion = data.map((m) => {
    const hasState = m.valence !== null && m.arousal !== null;
    const submerged =
      hasState && currentState
        ? stateDistance(m, currentState) > SUBMERSION_THRESHOLD
        : false;

    return {
      ...m,
      submerged,
      summary: submerged ? formatSummary(m.created_at) : null,
    };
  });

  res.json(withSubmersion);
});

// POST /api/messages — 사용자 메시지를 저장하고, Groq(Llama) 응답을 받아 같이 저장한다.
// 두 메시지 모두 "지금 이 순간의 tide check 상태"를 D_gen 스냅샷으로 같이 저장해둔다.
// episode 분리는 아직 없음 — 이번 주 핵심 흐름의 최소 버전.
router.post('/', async (req, res) => {
  const { content } = req.body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'content는 빈 문자열이 아니어야 합니다.' });
  }

  const stateAtGen = await getLatestTideCheck();
  const statePayload = stateAtGen
    ? { valence: stateAtGen.valence, arousal: stateAtGen.arousal }
    : {};

  const { data: userMessage, error: userError } = await supabase
    .from('messages')
    .insert({ role: 'user', content, ...statePayload })
    .select()
    .single();

  if (userError) {
    return res.status(500).json({ error: userError.message });
  }

  let aiText;
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content:
            '너는 TideNote라는 앱의 대화 상대다. 항상 한국어로만 답한다. ' +
            '다른 언어(중국어, 영어 등)를 절대 섞지 않는다. 짧고 자연스럽게 답한다.',
        },
        { role: 'user', content },
      ],
    });
    aiText = completion.choices[0].message.content;
  } catch (err) {
    return res.status(502).json({ error: 'AI 응답을 받지 못했어요: ' + err.message });
  }

  const { data: aiMessage, error: aiError } = await supabase
    .from('messages')
    .insert({ role: 'ai', content: aiText, ...statePayload })
    .select()
    .single();

  if (aiError) {
    return res.status(500).json({ error: aiError.message });
  }

  res.status(201).json({ userMessage, aiMessage });
});

export default router;
