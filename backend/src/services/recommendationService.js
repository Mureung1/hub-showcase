import prisma from '../config/prisma.js';
import { getAnalysis } from './analysisService.js';
import { searchRepos, fetchReposWithIssues } from './githubService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('recommendationService');

// 레포 검색 정책 (2026-07-20 결정: 이슈 우선이 아니라 "건강한 레포 우선" 검색)
// 스타 기준은 니치 언어에서 결과가 부족하면 완화값으로 한 번 더 검색한다
const MIN_STARS = 100;
const FALLBACK_MIN_STARS = 20;
const MIN_REPOS_PER_LANGUAGE = 5;
const MAX_LANGUAGES = 3; // 검색 호출 수 상한 (언어당 REST 1~2회)
const MAX_REPOS = 12; // GraphQL 일괄 조회 1쿼리에 담는 상한
const MAX_ITEMS_PER_REPO = 2; // 한 레포가 추천 목록을 도배하지 않게
const MAX_ITEMS = 10;

// 난이도 → 이슈 라벨 필터 (hard는 라벨 무관 검색)
const DIFFICULTY_ISSUE_LABELS = {
    easy: ['good first issue'],
    medium: ['help wanted'],
    hard: null,
};

const DIFFICULTY_REASON = {
    easy: 'good first issue 라벨이 있어 시작하기 좋아요',
    medium: 'help wanted 라벨로 메인테이너가 기여를 기다리고 있어요',
    hard: '희망 난이도와 일치하는 이슈예요',
};

// 이슈 라벨 → 난이도 추정 (IssueCache.difficulty와 동일 규칙)
function judgeDifficulty(labels) {
    const lower = labels.map((label) => label.toLowerCase());
    if (lower.includes('good first issue')) {
        return 'easy';
    }
    if (lower.includes('help wanted')) {
        return 'medium';
    }
    return 'hard';
}

// 규칙 기반 매칭 점수 (0~100) — 기본 10점 + 근거별 가점, 상위 근거 2개로 추천 이유 문장을 만든다
function scoreItem(repo, issueDifficulty, preferences) {
    const factors = [];

    // 언어: 주 언어 일치가 최우선, 아니면 레포 언어 구성에 포함돼도 가점
    if (repo.primaryLanguage && preferences.languages.includes(repo.primaryLanguage)) {
        factors.push({ score: 25, reason: `주 언어(${repo.primaryLanguage})와 일치해요` });
    } else {
        const matched = repo.languages.find((language) => preferences.languages.includes(language));
        if (matched) {
            factors.push({ score: 15, reason: `${matched}를 사용하는 레포예요` });
        }
    }

    // 난이도 라벨 일치
    if (issueDifficulty === preferences.difficulty) {
        factors.push({ score: 20, reason: DIFFICULTY_REASON[issueDifficulty] });
    }

    // 레포 인지도 (스타 구간별 — 검색 최소선은 넘긴 상태이므로 순위 가중치 역할)
    if (repo.stars >= 1000) {
        factors.push({ score: 15, reason: `⭐${repo.stars.toLocaleString()}개의 검증된 레포예요` });
    } else if (repo.stars >= 100) {
        factors.push({ score: 10, reason: '커뮤니티가 자리 잡은 레포예요' });
    } else if (repo.stars >= 20) {
        factors.push({ score: 5, reason: '작지만 살아있는 레포예요' });
    }

    // 레포 활동성 (최근 푸시가 가까울수록 리뷰받을 가능성이 높다)
    const daysSincePush = (Date.now() - new Date(repo.pushedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSincePush <= 30) {
        factors.push({ score: 10, reason: '최근 한 달 안에 활동한 레포예요' });
    } else if (daysSincePush <= 90) {
        factors.push({ score: 5, reason: '최근 석 달 안에 활동한 레포예요' });
    }

    // 입문 이슈 문화 (good first issue가 넉넉하면 첫 기여자 대응 경험이 많은 레포)
    if (repo.goodFirstIssueCount >= 5) {
        factors.push({ score: 5, reason: '입문자용 이슈가 넉넉한 레포예요' });
    }

    // 관심 주제와 레포 토픽 교집합
    const matchedTopics = repo.topics.filter((topic) => preferences.topics.includes(topic));
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

// 선호 언어별 레포 검색 → 중복 제거 합집합 (언어당 결과가 부족하면 스타 기준을 낮춰 재검색)
async function collectCandidateRepos(preferences) {
    const seen = new Set();
    const fullNames = [];
    for (const language of preferences.languages.slice(0, MAX_LANGUAGES)) {
        let found = await searchRepos({ language, difficulty: preferences.difficulty, minStars: MIN_STARS });
        if (found.length < MIN_REPOS_PER_LANGUAGE) {
            logger.info('레포 검색 결과 부족 — 스타 기준 완화 재검색', { language, found: found.length });
            found = await searchRepos({ language, difficulty: preferences.difficulty, minStars: FALLBACK_MIN_STARS });
        }
        for (const fullName of found) {
            if (!seen.has(fullName)) {
                seen.add(fullName);
                fullNames.push(fullName);
            }
        }
    }
    return fullNames.slice(0, MAX_REPOS);
}

// 조회한 레포·이슈를 캐시 테이블에 기록 (write-through)
// 같은 레포가 다음 추천·LLM 분석(#6)에서 재조회될 때 GitHub 호출을 아끼기 위한 저장이며,
// 실패해도 추천 응답에는 영향이 없어야 하므로 기다리지 않고 로그만 남긴다
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

// recommendations 레코드 → 명세(Recommendation 스키마) 응답 형태
function toRecommendationResponse(record) {
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
        })),
        createdAt: record.createdAt.toISOString(),
    };
}

// 분석 결과 + 선호 조건 → 추천 생성·저장 (openapi.yaml Recommendation 스키마)
// 흐름: 분석 이력 확인(없으면 404) → 레포 검색(REST) → 레포·이슈 일괄 조회(GraphQL 1쿼리)
//       → 규칙 기반 점수·정렬 → 캐시 기록 → Recommendation 저장 후 반환
// 조건에 맞는 결과가 없으면 명세대로 items: []인 추천을 그대로 저장·반환한다
export async function createRecommendation(githubId, preferences) {
    // 분석 이력이 없으면 getAnalysis가 404(ANALYSIS_NOT_FOUND)를 던진다 — 명세의 선행 조건
    const analysis = await getAnalysis(githubId);

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
            const { score, reason } = scoreItem(repo, difficulty, preferences);
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
            });
        }
    }
    items.sort((a, b) => b.matchScore - a.matchScore);
    const topItems = items.slice(0, MAX_ITEMS);

    const saved = await prisma.recommendation.create({
        data: {
            githubId: analysis.githubId,
            preferences,
            items: { create: topItems },
        },
        include: { items: { orderBy: { matchScore: 'desc' } } },
    });

    logger.info('추천 생성 완료', {
        githubId: analysis.githubId,
        recommendationId: saved.id,
        candidates: candidateNames.length,
        items: topItems.length,
    });

    return toRecommendationResponse(saved);
}
