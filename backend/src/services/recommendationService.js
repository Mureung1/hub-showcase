import prisma from '../config/prisma.js';
import { getAnalysis } from './analysisService.js';
import { searchRepos, fetchReposWithIssues, fetchIssueBody, fetchContributingGuide } from './githubService.js';
import { analyzeIssue, rerankItems } from './llmService.js';
import { getFavoriteKeys } from './favoriteService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('recommendationService');

// 레포 우선 검색 기준 (2026-07-20 결정). 결과 부족 시 스타 기준 완화 후 재검색
const MIN_STARS = 100;
const FALLBACK_MIN_STARS = 20;
const MIN_REPOS_PER_LANGUAGE = 5;
const MAX_LANGUAGES = 3; // 검색 호출 수 상한 (언어당 REST 1~2회)
const MAX_REPOS = 12; // GraphQL 일괄 조회 1쿼리에 담는 상한
const MAX_ITEMS_PER_REPO = 2; // 한 레포가 추천 목록을 도배하지 않게
const MAX_ITEMS = 10;

// 재추천 다양화 — 일 단위(UTC) githubId+동일 조건당 "새로 계산"하는 상한 (2026-07-27 결정, checklist Week4).
// 도달하면 에러가 아니라 오늘 만든 마지막 결과를 그대로 반환한다(재계산·GitHub/LLM 호출만 아낌)
const DAILY_RECOMMENDATION_LIMIT = 3;

// 난이도 → 이슈 라벨 필터. hard = enhancement(기능 구현급) 이슈로 정의 (2026-07-20 결정)
const DIFFICULTY_ISSUE_LABELS = {
    easy: ['good first issue'],
    medium: ['help wanted'],
    hard: ['enhancement'],
};

const DIFFICULTY_REASON = {
    easy: 'good first issue 라벨이 있어 시작하기 좋아요',
    medium: 'help wanted 라벨로 메인테이너가 기여를 기다리고 있어요',
    hard: '기능 구현급 이슈라 도전할 만해요',
};

// skillLevel ↔ 난이도 정합 가점 (decisions.md "추천 기준 3단 구조" ②)
const SKILL_DIFFICULTY_MATCH = { beginner: 'easy', intermediate: 'medium', advanced: 'hard' };

// 관심 주제 유사어 매핑 (ml → machine-learning 등)
const TOPIC_SYNONYMS = {
    ml: ['machine-learning'],
    ai: ['artificial-intelligence'],
    web: ['webdev', 'web-development', 'frontend'],
    cli: ['command-line', 'command-line-tool'],
    api: ['rest-api', 'graphql'],
    db: ['database'],
};

function expandTopics(topics) {
    const expanded = new Set(topics);
    for (const topic of topics) {
        for (const synonym of TOPIC_SYNONYMS[topic] ?? []) {
            expanded.add(synonym);
        }
    }
    return expanded;
}

// 이슈 라벨 → 난이도 추정 (IssueCache.difficulty와 동일 규칙). gfi 라벨이 최우선
export function judgeDifficulty(labels) {
    const lower = labels.map((label) => label.toLowerCase());
    if (lower.includes('good first issue')) {
        return 'easy';
    }
    if (lower.includes('help wanted')) {
        return 'medium';
    }
    return 'hard';
}

// 규칙 기반 매칭 점수(0~100): 기본 10점 + 근거별 가점, 상위 근거 2개로 이유 문장 생성
export function scoreItem(repo, issueDifficulty, preferences, skillLevel) {
    const factors = [];

    // 언어 비교는 소문자로 정규화 (검색은 대소문자 무시라 표기 차이로 점수만 빠지면 어색함)
    const preferredLanguages = preferences.languages.map((language) => language.toLowerCase());
    const preferredTopics = expandTopics(preferences.topics.map((topic) => topic.toLowerCase()));

    // 언어: 주 언어 일치가 최우선, 아니면 레포 언어 구성에 포함돼도 가점
    if (repo.primaryLanguage && preferredLanguages.includes(repo.primaryLanguage.toLowerCase())) {
        factors.push({ score: 25, reason: `주 언어(${repo.primaryLanguage})와 일치해요` });
    } else {
        const matched = repo.languages.find((language) => preferredLanguages.includes(language.toLowerCase()));
        if (matched) {
            factors.push({ score: 15, reason: `${matched}를 사용하는 레포예요` });
        }
    }

    // 난이도 라벨 일치
    if (issueDifficulty === preferences.difficulty) {
        factors.push({ score: 20, reason: DIFFICULTY_REASON[issueDifficulty] });
    }

    // skillLevel과 이슈 난이도가 맞으면 추가 가점
    if (SKILL_DIFFICULTY_MATCH[skillLevel] === issueDifficulty) {
        factors.push({ score: 8, reason: '지금 실력에 맞는 난이도예요' });
    }

    // 레포 인지도: 스타 수 로그 스케일 가점 (tier 구간 대신 연속값 — 동점 완화)
    const starScore = Math.min(15, Math.round(Math.log10(repo.stars + 1) * 4));
    if (starScore > 0) {
        const starReason = repo.stars >= 1000
            ? `⭐${repo.stars.toLocaleString()}개의 검증된 레포예요`
            : repo.stars >= 100
                ? '커뮤니티가 자리 잡은 레포예요'
                : '작지만 살아있는 레포예요';
        factors.push({ score: starScore, reason: starReason });
    }

    // 레포 활동성 (최근 푸시가 가까울수록 리뷰받을 가능성이 높다)
    const daysSincePush = (Date.now() - new Date(repo.pushedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSincePush <= 30) {
        factors.push({ score: 10, reason: '최근 한 달 안에 활동한 레포예요' });
    } else if (daysSincePush <= 90) {
        factors.push({ score: 5, reason: '최근 석 달 안에 활동한 레포예요' });
    }

    // 입문 이슈 문화: medium은 help wanted 수, 그 외는 good first issue 수로 판단
    const issueCultureCount = preferences.difficulty === 'medium' ? repo.helpWantedIssueCount : repo.goodFirstIssueCount;
    const issueCultureReason = preferences.difficulty === 'medium'
        ? '도움이 필요한 이슈가 넉넉한 레포예요'
        : '입문자용 이슈가 넉넉한 레포예요';
    if (issueCultureCount >= 5) {
        factors.push({ score: 5, reason: issueCultureReason });
    }

    // 관심 주제와 레포 토픽 교집합 (유사어 확장 포함)
    const matchedTopics = repo.topics.filter((topic) => preferredTopics.has(topic.toLowerCase()));
    if (matchedTopics.length > 0) {
        factors.push({
            score: Math.min(matchedTopics.length * 5, 15),
            reason: `관심 주제(${matchedTopics.join(', ')})와 맞아요`,
        });
    }

    const score = Math.min(100, 10 + factors.reduce((sum, factor) => sum + factor.score, 0));
    const reason = factors
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((factor) => factor.reason)
        .join(' · ') || '조건에 맞는 오픈 이슈가 있어요';

    return { score, reason };
}

// 선호 언어별 레포 검색 후 라운드로빈 병합 (순차 병합이면 첫 언어가 MAX_REPOS를 독식)
async function collectCandidateRepos(preferences) {
    const resultsPerLanguage = [];
    for (const language of preferences.languages.slice(0, MAX_LANGUAGES)) {
        let found = await searchRepos({ language, difficulty: preferences.difficulty, minStars: MIN_STARS });
        if (found.length < MIN_REPOS_PER_LANGUAGE) {
            logger.info('레포 검색 결과 부족 — 스타 기준 완화 재검색', { language, found: found.length });
            found = await searchRepos({ language, difficulty: preferences.difficulty, minStars: FALLBACK_MIN_STARS });
        }
        resultsPerLanguage.push(found);
    }

    const seen = new Set();
    const fullNames = [];
    const longest = Math.max(0, ...resultsPerLanguage.map((found) => found.length));
    for (let rank = 0; rank < longest && fullNames.length < MAX_REPOS; rank += 1) {
        for (const found of resultsPerLanguage) {
            if (rank >= found.length || fullNames.length >= MAX_REPOS) {
                continue;
            }
            const fullName = found[rank];
            if (!seen.has(fullName)) {
                seen.add(fullName);
                fullNames.push(fullName);
            }
        }
    }
    return fullNames;
}

// 레포·이슈 캐시 기록 (write-through). 실패해도 추천 응답엔 영향 없이 로그만 남김
function cacheReposAndIssues(repos) {
    const fetchedAt = new Date();
    for (const repo of repos) {
        const repoData = {
            description: repo.description,
            primaryLanguage: repo.primaryLanguage,
            languages: repo.languages,
            stars: repo.stars,
            topics: repo.topics,
            goodFirstIssueCount: repo.goodFirstIssueCount,
            fetchedAt,
        };
        prisma.repoCache
            .upsert({ where: { fullName: repo.fullName }, update: repoData, create: { fullName: repo.fullName, ...repoData } })
            .catch((error) => logger.warn('레포 캐시 저장 실패:', { error: error.message, fullName: repo.fullName }));

        for (const issue of repo.issues) {
            const issueData = {
                title: issue.title,
                labels: issue.labels,
                difficulty: judgeDifficulty(issue.labels),
                url: issue.url,
                state: 'open',
                fetchedAt,
            };
            prisma.issueCache
                .upsert({
                    where: { repoFullName_issueNumber: { repoFullName: repo.fullName, issueNumber: issue.number } },
                    update: issueData,
                    create: { repoFullName: repo.fullName, issueNumber: issue.number, ...issueData },
                })
                .catch((error) =>
                    logger.warn('이슈 캐시 저장 실패:', { error: error.message, fullName: repo.fullName, issueNumber: issue.number }));
        }
    }
}

function startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// preferences 비교용 정규화 키 — 언어/토픽 대소문자·순서 차이를 흡수해 "같은 조건"을 판정한다.
// 이게 없으면 언어 배열 순서만 다른 요청이 서로 다른 조건으로 오판돼 상한을 우회할 수 있다
function normalizePreferences(preferences) {
    return JSON.stringify({
        languages: [...preferences.languages].map((language) => language.toLowerCase()).sort(),
        difficulty: preferences.difficulty,
        topics: [...(preferences.topics ?? [])].map((topic) => topic.toLowerCase()).sort(),
    });
}

// 재추천 다양화 — 오늘(UTC) 이 githubId가 "동일 조건"으로 만든 추천을 최신순으로 전부 가져온다.
// 조건을 바꾼 탐색까지 상한에 걸리면 정상적인 탐색을 막게 되므로, 상한은 같은 preferences로의
// 반복 재요청에만 적용한다(2026-07-27 결정 보완 — 최초의 "githubId 전체 기준"은 상한 대신 다양화 범위에만 유지).
// 상한 도달 시 에러 대신 [0](가장 최근 것)을 그대로 재사용해서, "새로 계산은 안 하되 결과 없이 막지는
// 않는다"는 캐시처럼 동작하게 한다 — 처음엔 에러로 막았는데, 이미 오늘 만들어둔 결과가 있는데도
// 그냥 실패로 끝나는 게 어색하다는 피드백을 받아 바꿨다(2026-07-27)
async function findTodaysSameConditionRecommendations(githubId, preferences) {
    const todaysRecommendations = await prisma.recommendation.findMany({
        where: { githubId, createdAt: { gte: startOfUtcDay() } },
        include: { items: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });
    const targetKey = normalizePreferences(preferences);
    return todaysRecommendations.filter((rec) => normalizePreferences(rec.preferences) === targetKey);
}

// 재추천 다양화 — 이 사용자가 과거에 받은 (repoFullName#issueNumber) 집합.
// preferences 일치 여부와 무관하게 githubId 전체 이력을 대상으로 한다 — Json 비교 없이 기존 인덱스만으로 조회되고,
// "이미 본 이슈"라는 사용자 체감과도 preferences 단위 구분보다 더 맞는다 (2026-07-27 결정)
async function getSeenIssueKeys(githubId) {
    const seenItems = await prisma.recommendationItem.findMany({
        where: { recommendation: { githubId } },
        select: { repoFullName: true, issueNumber: true },
    });
    return new Set(seenItems.map((item) => `${item.repoFullName}#${item.issueNumber}`));
}

// 재추천 다양화 정렬 규칙 — matchScore가 1순위(화면에 그대로 노출되므로 점수보다 다양화를 우선하면
// "정렬이 안 맞는다"로 보임), isSeen(안 본 이슈 우선)은 동점일 때만 적용되는 타이브레이커.
// 1차 정렬(candidateItems)과 LLM 재순위 후 재정렬(rerankTopItems) 두 곳에서 똑같이 써야 해서
// 하나로 뽑아둔다 — 따로 두면 한쪽만 고쳤을 때 조용히 어긋난다(2026-07-27 코드리뷰 발견)
function compareForDiversification(a, b) {
    return b.matchScore - a.matchScore || (a.isSeen === b.isSeen ? 0 : a.isSeen ? 1 : -1) || b.repoStars - a.repoStars;
}

// 동점 구간만 언어별 라운드로빈으로 재배치 (스타 tie-break만 쓰면 TS 등 인플레 생태계가 독식)
// 입력은 (matchScore desc, repoStars desc) 정렬 전제
function interleaveEqualScores(items) {
    const result = [];
    let start = 0;
    while (start < items.length) {
        let end = start;
        while (end < items.length && items[end].matchScore === items[start].matchScore) {
            end += 1;
        }
        const queuesByLanguage = new Map();
        for (const item of items.slice(start, end)) {
            const queue = queuesByLanguage.get(item.primaryLanguage) || [];
            queue.push(item); // 그룹 내부는 스타순 유지
            queuesByLanguage.set(item.primaryLanguage, queue);
        }
        const queues = [...queuesByLanguage.values()];
        for (let rank = 0, added = true; added; rank += 1) {
            added = false;
            for (const queue of queues) {
                if (rank < queue.length) {
                    result.push(queue[rank]);
                    added = true;
                }
            }
        }
        start = end;
    }
    return result;
}

// 규칙 기반 상위 MAX_ITEMS건을 LLM으로 재순위(#6 3단 구조 ③ "LLM 재순위" — decisions.md 2026-07-20/07-23).
// 트리밍(상위 MAX_ITEMS 추리기) 이후에만 적용해 비용을 목록 크기로 고정한다 — 트리밍 전 후보군(최대 24개)
// 까지 재순위하면 "지연 생성으로 실비용 0에 수렴"이라는 #6 원칙과 충돌하기 때문.
// LLM 호출은 건별이 아니라 배치 1번(rerankItems) — 건별 병렬 호출은 Gemini 무료 티어 분당 한도를
// 순간적으로 다 써버려 실전에서 전멸하는 걸 확인해 배치로 바꿨다(2026-07-23, decisions.md 참조).
// 일부 항목만 응답에 없거나 배치 자체가 실패해도 그 항목만 규칙 점수/이유를 그대로 유지한다
async function rerankTopItems(items, analysis) {
    const profile = { recentRepos: analysis.recentRepos, contributionHistory: analysis.contributionHistory };
    const issueBodies = await Promise.all(items.map((item) => fetchIssueBody(item.repoFullName, item.issueNumber)));
    const results = await rerankItems(
        items.map((item, index) => ({
            issueTitle: item.issueTitle,
            issueBody: issueBodies[index],
            labels: item.labels,
            difficulty: item.difficulty,
            ruleScore: item.matchScore,
            ruleReason: item.reason,
        })),
        profile,
    );

    const reranked = items.map((item, index) => {
        const result = results[index];
        if (!result) {
            return item;
        }
        return { ...item, matchScore: Math.min(100, Math.max(0, item.matchScore + result.adjustment)), reason: result.reason };
    });

    // 점수가 바뀌었으니 동점 그룹도 달라진다 — 정렬·언어 인터리브를 재적용
    reranked.sort(compareForDiversification);
    return interleaveEqualScores(reranked).map((item, index) => ({ ...item, position: index }));
}

// recommendations 레코드 → 명세(Recommendation 스키마) 응답 형태.
// isNewByKey가 주어지면(POST 응답 전용) 다양화 배지용 isNew 필드를 함께 채운다 — 이건 "생성 시점"에만
// 의미 있는 스냅샷이라 GET 재조회(isNewByKey 없음)에서는 필드 자체를 응답에 넣지 않는다.
// isFavoritedByKey가 주어지면 즐겨찾기 여부를 채운다 — 이건 조회 시점 최신 상태라 POST/GET 모두에서 채운다
function toRecommendationResponse(record, { isNewByKey = null, isFavoritedByKey = null } = {}) {
    return {
        id: record.id,
        githubId: record.githubId,
        preferences: record.preferences,
        items: record.items.map((item) => ({
            repoFullName: item.repoFullName,
            repoDescription: item.repoDescription,
            repoStars: item.repoStars,
            repoUrl: item.repoUrl,
            primaryLanguage: item.primaryLanguage,
            issueNumber: item.issueNumber,
            issueTitle: item.issueTitle,
            issueUrl: item.issueUrl,
            labels: item.labels,
            difficulty: item.difficulty,
            matchScore: item.matchScore,
            reason: item.reason,
            // LLM 이슈 분석(#6, 지연 생성) — RecommendationItem엔 스냅샷을 안 남기고 매 조회 시 IssueCache에서 병합
            issueSummary: null,
            requiredSkills: null,
            guide: null,
            ...(isNewByKey ? { isNew: isNewByKey.get(`${item.repoFullName}#${item.issueNumber}`) ?? true } : {}),
            ...(isFavoritedByKey
                ? { isFavorited: isFavoritedByKey.has(`${item.repoFullName}#${item.issueNumber}`) }
                : {}),
        })),
        createdAt: record.createdAt.toISOString(),
    };
}

// items의 (repoFullName, issueNumber)로 IssueCache를 일괄 조회해 이미 성공한 분석 결과를 병합.
// LLM을 부르지 않는 조회 전용 경로라 호출 비용이 없다 — 모든 GET에서 항상 실행
async function enrichWithCachedAnalysis(items) {
    if (items.length === 0) {
        return items;
    }
    const cached = await prisma.issueCache.findMany({
        where: { OR: items.map(({ repoFullName, issueNumber }) => ({ repoFullName, issueNumber })) },
    });
    const byKey = new Map(cached.map((row) => [`${row.repoFullName}#${row.issueNumber}`, row]));

    return items.map((item) => {
        const row = byKey.get(`${item.repoFullName}#${item.issueNumber}`);
        if (!row?.issueSummary) {
            return item;
        }
        return { ...item, issueSummary: row.issueSummary, requiredSkills: row.requiredSkills, guide: row.guide };
    });
}

// 이슈 1건을 LLM으로 분석하고, 성공하면 IssueCache에 영구 저장(TTL 없음) 후 결과를 병합해 반환.
// 실패하면 필드를 null로 둔 채 그대로 반환 — 캐시에는 아무것도 남기지 않아 다음 조회가 재시도가 된다
// (decisions.md 2026-07-21 "캐시는 성공 결과만 저장")
async function analyzeAndCacheIssue(item) {
    const [issueBody, contributingMd] = await Promise.all([
        fetchIssueBody(item.repoFullName, item.issueNumber),
        fetchContributingGuide(item.repoFullName),
    ]);
    const analysis = await analyzeIssue({
        issueTitle: item.issueTitle,
        issueBody,
        labels: item.labels,
        contributingMd,
    });
    if (!analysis) {
        return item;
    }

    const analysisData = {
        issueSummary: analysis.issueSummary,
        requiredSkills: analysis.requiredSkills,
        guide: analysis.guide,
        analyzedAt: new Date(),
    };
    try {
        // upsert인 이유: cacheReposAndIssues의 IssueCache 기록이 fire-and-forget(await 없음)이라
        // 추천 생성 직후 바로 이슈를 열람하면 이 행이 아직 없을 수 있다 — update만 쓰면 그 경우 조용히 유실됨
        await prisma.issueCache.upsert({
            where: { repoFullName_issueNumber: { repoFullName: item.repoFullName, issueNumber: item.issueNumber } },
            update: analysisData,
            create: {
                repoFullName: item.repoFullName,
                issueNumber: item.issueNumber,
                title: item.issueTitle,
                labels: item.labels,
                difficulty: item.difficulty,
                url: item.issueUrl,
                state: 'open',
                fetchedAt: new Date(),
                ...analysisData,
            },
        });
    } catch (error) {
        logger.warn('이슈 분석 캐시 저장 실패:', { error: error.message, repoFullName: item.repoFullName, issueNumber: item.issueNumber });
    }

    return { ...item, issueSummary: analysis.issueSummary, requiredSkills: analysis.requiredSkills, guide: analysis.guide };
}

// 저장된 추천 재조회 (GET /api/recommendations/:id). 없으면 404 RECOMMENDATION_NOT_FOUND
// focus({ repoFullName, issueNumber })가 주어지고 해당 아이템이 아직 미분석이면 그 1건만 LLM 분석을 실행한다
// (#6 지연 생성 — focus 없이 호출하면 캐시된 값만 병합하고 LLM은 절대 부르지 않는다, 비용 0)
export async function getRecommendationById(id, focus = null) {
    const record = await prisma.recommendation.findUnique({
        where: { id },
        include: { items: { orderBy: { position: 'asc' } } },
    });
    if (!record) {
        const notFound = new Error('추천 결과를 찾을 수 없습니다.');
        notFound.status = 404;
        notFound.code = 'RECOMMENDATION_NOT_FOUND';
        throw notFound;
    }

    const isFavoritedByKey = await getFavoriteKeys(record.githubId);
    const response = toRecommendationResponse(record, { isFavoritedByKey });
    response.items = await enrichWithCachedAnalysis(response.items);

    if (focus) {
        const index = response.items.findIndex(
            (item) => item.repoFullName === focus.repoFullName && item.issueNumber === focus.issueNumber);
        // focus가 이 추천에 속하지 않거나 이미 분석돼 있으면 조용히 건너뛴다 — 힌트일 뿐 에러 대상이 아님
        if (index !== -1 && !response.items[index].issueSummary) {
            response.items[index] = await analyzeAndCacheIssue(response.items[index]);
        }
    }

    return response;
}

// 분석 결과 + 선호 조건 → 추천 생성·저장 (openapi.yaml Recommendation 스키마)
// 분석 확인 → 레포 검색 → 레포·이슈 일괄 조회 → 점수·정렬 → 캐시 기록 → 저장
// 결과 없으면 items: [] 그대로 저장·반환
export async function createRecommendation(githubId, preferences) {
    // 분석 이력 없으면 getAnalysis가 404(ANALYSIS_NOT_FOUND) 던짐
    const analysis = await getAnalysis(githubId);

    // 알려진 한계(2026-07-27 코드리뷰 발견, 의도적으로 미수정): 이 확인과 아래 prisma.recommendation.create
    // 사이에 GitHub/LLM 호출(수 초)이 끼어 있어 "확인 후 실행" 경쟁 조건이 있다 — 같은 githubId+조건 요청이
    // 그 시간差 안에 동시에 들어오면 상한(3회)을 넘겨 저장될 수 있다. DB advisory lock으로 완전히 막을 수
    // 있지만 GitHub/LLM 호출 내내 커넥션을 붙잡아야 해서 비용이 크고, 정상 경로(같은 탭)에서는 프론트가
    // 이미 재검색 버튼을 disabled 처리해 중복 요청 자체가 안 나가므로(Result.jsx) 멀티탭/직접 API 호출
    // 같은 드문 경우에만 해당한다. 소프트 캡이라 이 정도 위험은 감수하기로 함
    const sameConditionToday = await findTodaysSameConditionRecommendations(analysis.githubId, preferences);
    if (sameConditionToday.length >= DAILY_RECOMMENDATION_LIMIT) {
        logger.info('재추천 상한 도달 — 새로 계산하지 않고 오늘 마지막 결과를 그대로 반환', {
            githubId: analysis.githubId,
            recommendationId: sameConditionToday[0].id,
        });
        const isFavoritedByKey = await getFavoriteKeys(analysis.githubId);
        return toRecommendationResponse(sameConditionToday[0], { isFavoritedByKey });
    }

    // 서로 다른 테이블(RecommendationItem/Favorite)을 조회하는 독립 쿼리라 순서대로 기다릴 이유가 없다
    // — 둘 다 동시에 시작해서 느린 쪽 하나만큼만 기다리면 된다(2026-07-27 코드리뷰 발견)
    const [seenKeys, isFavoritedByKey] = await Promise.all([
        getSeenIssueKeys(analysis.githubId),
        getFavoriteKeys(analysis.githubId),
    ]);
    const candidateNames = await collectCandidateRepos(preferences);
    const repos = await fetchReposWithIssues(candidateNames, DIFFICULTY_ISSUE_LABELS[preferences.difficulty]);
    cacheReposAndIssues(repos);

    const items = [];
    for (const repo of repos) {
        // 희망 난이도와 맞는 이슈를 우선 배치한 뒤 레포당 상한 적용
        const issues = [...repo.issues]
            .sort((a, b) =>
                (judgeDifficulty(b.labels) === preferences.difficulty) - (judgeDifficulty(a.labels) === preferences.difficulty))
            .slice(0, MAX_ITEMS_PER_REPO);
        for (const issue of issues) {
            const difficulty = judgeDifficulty(issue.labels);
            const { score, reason } = scoreItem(repo, difficulty, preferences, analysis.skillLevel);
            items.push({
                repoFullName: repo.fullName,
                repoDescription: repo.description,
                repoStars: repo.stars,
                repoUrl: repo.url,
                primaryLanguage: repo.primaryLanguage ?? repo.languages[0] ?? 'Unknown',
                issueNumber: issue.number,
                issueTitle: issue.title,
                issueUrl: issue.url,
                labels: issue.labels,
                difficulty,
                matchScore: score,
                reason,
                isSeen: seenKeys.has(`${repo.fullName}#${issue.number}`),
            });
        }
    }
    // 완전히 제외하지 않는 이유: 후보가 적으면(mock처럼) 안 본 이슈가 부족해도 빈 결과 대신 이전 이슈로 자연스럽게 채워지게 하기 위함
    items.sort(compareForDiversification);
    const trimmedItems = interleaveEqualScores(items).slice(0, MAX_ITEMS);
    const rerankedItems = await rerankTopItems(trimmedItems, analysis);
    const isNewByKey = new Map(
        rerankedItems.map((item) => [`${item.repoFullName}#${item.issueNumber}`, !item.isSeen]));
    const topItems = rerankedItems.map(({ isSeen: _isSeen, ...item }) => item);

    const saved = await prisma.recommendation.create({
        data: {
            githubId: analysis.githubId,
            preferences,
            items: { create: topItems },
        },
        include: { items: { orderBy: { position: 'asc' } } },
    });

    logger.info('추천 생성 완료', {
        githubId: analysis.githubId,
        recommendationId: saved.id,
        candidates: candidateNames.length,
        items: topItems.length,
        newItems: [...isNewByKey.values()].filter(Boolean).length,
    });

    return toRecommendationResponse(saved, { isNewByKey, isFavoritedByKey });
}

// 전체 검색 이력 (GET /api/recommendations?githubId=) — 이 githubId가 지금까지 생성한 모든 추천을
// 최신순으로 반환한다. Recommendation은 재조회/필터링용으로 삭제 없이 계속 쌓이므로(decisions.md DB 설계
// 이유) 새 저장·집계 없이 그대로 나열하면 된다. 각 세션(=한 번의 검색)이 배열의 원소 하나 — 프론트는
// createdAt/preferences를 세션 그룹 헤더로 쓴다
export async function listRecommendationHistory(githubId) {
    const isFavoritedByKey = await getFavoriteKeys(githubId);
    const records = await prisma.recommendation.findMany({
        where: { githubId },
        include: { items: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => toRecommendationResponse(record, { isFavoritedByKey }));
}
