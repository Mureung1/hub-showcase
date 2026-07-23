import config from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('llmService');

// 경량·무료 티어 모델 (decisions.md 2026-07-21 "이슈 분석·재순위(#6) LLM 제공자: Gemini",
// 2026-07-23 "gemini-2.0-flash-lite → gemini-flash-lite-latest" — 버전 고정 모델은 무료 할당량 0이라 변경)
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 이슈 본문은 토큰 비용 방어 차원에서 앞부분만 사용 (요약·가이드 생성엔 서두로 충분)
const MAX_ISSUE_BODY_LENGTH = 4000;

// 배열 길이 상한 — 프롬프트 지시("3~5단계")를 벗어난 폭주 응답을 API·검증 양쪽에서 방어
const MAX_REQUIRED_SKILLS = 6;
const MAX_GUIDE_STEPS = 6;

// response_schema로 모델 출력 구조를 강제 (JSON 모드) — 파싱 실패 여지·과도한 응답 크기를 원천 차단
const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        issueSummary: { type: 'string', minLength: 1 },
        requiredSkills: { type: 'array', items: { type: 'string' }, maxItems: MAX_REQUIRED_SKILLS },
        guide: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: MAX_GUIDE_STEPS },
    },
    required: ['issueSummary', 'requiredSkills', 'guide'],
};

// LLM 응답이 실제로 쓸 수 있는 형태인지 검증. response_schema를 강제해도 모델(또는 API 구현)이 규칙을
// 어길 수 있어(빈 문자열, 상한 초과 배열 등) 별도 방어가 필요함 — 이 검증을 통과해야만 "성공"으로 캐시된다
// (decisions.md 2026-07-21 "캐시는 성공 결과만 저장" — 여기서 말하는 성공의 기준)
export function isValidLlmAnalysis(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return false;
    }
    const { issueSummary, requiredSkills, guide } = parsed;
    if (typeof issueSummary !== 'string' || issueSummary.trim() === '') {
        return false;
    }
    if (!Array.isArray(requiredSkills) || requiredSkills.length > MAX_REQUIRED_SKILLS
        || !requiredSkills.every((skill) => typeof skill === 'string')) {
        return false;
    }
    if (!Array.isArray(guide) || guide.length === 0 || guide.length > MAX_GUIDE_STEPS
        || !guide.every((step) => typeof step === 'string')) {
        return false;
    }
    return true;
}

// 재순위 점수 보정 폭 — 규칙 점수를 뼈대로 두고 LLM은 흥미·명확성만 가감하도록 제한
// (decisions.md "역할 분리" 원칙 — LLM이 절대점수를 새로 매기지 않는다)
const MAX_SCORE_ADJUSTMENT = 15;

// 이슈 본문을 배치 하나에 여러 건 넣다 보니 건별 분석보다 훨씬 짧게 truncate (토큰 폭주 방지)
const MAX_RERANK_ISSUE_BODY_LENGTH = 800;

// 재순위는 목록 10건을 개별 호출하지 않고 배열 응답 1개로 한 번에 받는다 (2026-07-23 결정 — 아래 참고)
const BATCH_RERANK_RESPONSE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            index: { type: 'integer', minimum: 0 },
            adjustment: { type: 'integer', minimum: -MAX_SCORE_ADJUSTMENT, maximum: MAX_SCORE_ADJUSTMENT },
            reason: { type: 'string', minLength: 1 },
        },
        required: ['index', 'adjustment', 'reason'],
    },
};

// 배치 재순위 응답 검증 — 배열 길이는 itemCount 이하(모델이 일부를 건너뛰어도 됨), 각 원소의
// index가 유효 범위인지·adjustment가 허용 폭 안인지·reason이 비어있지 않은지 확인
export function isValidBatchRerankResult(parsed, itemCount) {
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > itemCount) {
        return false;
    }
    return parsed.every((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return false;
        }
        const { index, adjustment, reason } = entry;
        if (!Number.isInteger(index) || index < 0 || index >= itemCount) {
            return false;
        }
        if (!Number.isInteger(adjustment) || adjustment < -MAX_SCORE_ADJUSTMENT || adjustment > MAX_SCORE_ADJUSTMENT) {
            return false;
        }
        return typeof reason === 'string' && reason.trim() !== '';
    });
}

function buildAnalysisPrompt({ issueTitle, issueBody, labels, contributingMd }) {
    const truncatedBody = (issueBody || '').slice(0, MAX_ISSUE_BODY_LENGTH);
    return [
        '다음 GitHub 이슈를 분석해서 오픈소스 첫 기여자를 위한 한글 요약·필요 기술·기여 가이드를 만들어줘.',
        `이슈 제목: ${issueTitle}`,
        `라벨: ${labels.join(', ') || '없음'}`,
        `이슈 본문:\n${truncatedBody || '(본문 없음)'}`,
        contributingMd ? `레포 기여 가이드(CONTRIBUTING.md):\n${contributingMd.slice(0, MAX_ISSUE_BODY_LENGTH)}` : '',
        '요약은 2~3문장, guide는 3~5단계로 작성해줘.',
    ].filter(Boolean).join('\n\n');
}

// 목록 10건을 [0], [1]... 번호를 매겨 한 프롬프트에 나열 — 요청 1번으로 전부 재순위한다
// (2026-07-23: 건별 호출 10개를 병렬로 쐈더니 Gemini 무료 티어 분당 한도에 걸려 전멸하는 걸 실측 확인 — decisions.md 참조)
function buildBatchRerankPrompt({ items, profile }) {
    const recentRepos = (profile.recentRepos || []).map((repo) => repo.nameWithOwner).join(', ') || '없음';
    const contributionHistory = (profile.contributionHistory || []).map((repo) => repo.nameWithOwner).join(', ') || '없음';
    const issuesText = items
        .map((item, index) => [
            `[${index}] 이슈 제목: ${item.issueTitle}`,
            `난이도: ${item.difficulty}`,
            `라벨: ${item.labels.join(', ') || '없음'}`,
            `이슈 본문: ${(item.issueBody || '').slice(0, MAX_RERANK_ISSUE_BODY_LENGTH) || '(본문 없음)'}`,
            `규칙 기반 점수: ${item.ruleScore}점 (근거: ${item.ruleReason})`,
        ].join('\n'))
        .join('\n\n');

    return [
        '아래는 한 사용자에게 추천된 오픈소스 이슈 목록이다. 각 이슈가 이 사용자에게 얼마나 흥미롭고 명확한지 판단해서 매칭 점수를 소폭 보정해줘.',
        `사용자가 최근 활동한 레포: ${recentRepos}`,
        `사용자가 과거 외부 기여한 레포: ${contributionHistory}`,
        issuesText,
        `점수는 각 이슈의 규칙 기반 점수를 기준으로 -${MAX_SCORE_ADJUSTMENT}~+${MAX_SCORE_ADJUSTMENT} 사이에서만 가감해줘.`,
        '이슈 본문이 모호하거나 정보가 부족하면 감점, 사용자의 최근 관심사·기여 이력과 겹치면 가점해줘.',
        '응답 배열의 각 원소는 위 [번호]를 index로 사용해줘. reason은 그 사용자에게 왜 맞는지(또는 왜 애매한지) 한글 한 문장으로 새로 써줘.',
    ].filter(Boolean).join('\n\n');
}

// Gemini generateContent 호출 공통 처리 — 요청 조립, 실패 시 항상 null(never throw)
async function callGemini(prompt, schema, validate, context) {
    if (!config.geminiApiKey) {
        logger.info('GEMINI_API_KEY 미설정 — LLM 호출 건너뜀', context);
        return null;
    }

    try {
        const response = await fetch(`${GEMINI_URL}?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: 'application/json',
                    response_schema: schema,
                },
            }),
        });

        if (!response.ok) {
            logger.warn('Gemini API 호출 실패', { status: response.status, ...context });
            return null;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);

        if (!validate(parsed)) {
            logger.warn('Gemini 응답이 기대한 형식이 아님', context);
            return null;
        }
        return parsed;
    } catch (error) {
        logger.warn('LLM 호출 실패:', { error: error.message, ...context });
        return null;
    }
}

// 이슈 1건을 분석해 {issueSummary, requiredSkills, guide}를 반환. 실패하면 항상 null
// (API 키 없음/네트워크 오류/비정상 응답/스키마 위반 모두 동일하게 폴백 — decisions.md 2026-07-21)
export async function analyzeIssue({ issueTitle, issueBody, labels, contributingMd }) {
    return callGemini(
        buildAnalysisPrompt({ issueTitle, issueBody, labels, contributingMd }),
        RESPONSE_SCHEMA,
        isValidLlmAnalysis,
        { issueTitle },
    );
}

// 추천 목록 상위 items건을 LLM 요청 1번으로 재순위(#6 3단 구조 ③) — 규칙 점수에
// ±MAX_SCORE_ADJUSTMENT 가감, reason 교체. items는 {issueTitle, issueBody, labels, difficulty,
// ruleScore, ruleReason} 배열. 반환값은 입력과 같은 길이의 배열 — 각 원소는
// {adjustment, reason} | null(그 항목만 실패했거나 요청 자체가 실패한 경우)
export async function rerankItems(items, profile) {
    const results = new Array(items.length).fill(null);
    if (items.length === 0) {
        return results;
    }

    const parsed = await callGemini(
        buildBatchRerankPrompt({ items, profile }),
        BATCH_RERANK_RESPONSE_SCHEMA,
        (value) => isValidBatchRerankResult(value, items.length),
        { itemCount: items.length },
    );
    if (!parsed) {
        return results;
    }
    for (const entry of parsed) {
        results[entry.index] = { adjustment: entry.adjustment, reason: entry.reason };
    }
    return results;
}
