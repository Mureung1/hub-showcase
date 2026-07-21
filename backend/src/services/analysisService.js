import prisma from '../config/prisma.js';
import { fetchUserProfile } from './githubService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('analysisService');

// 분석 캐시 TTL (openapi.yaml 명세)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// GET 조회 시 이보다 오래되면 재분석 (배치 삭제 대신 조회 시점 검사, 2026-07-16 결정)
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// skillLevel 판정 규칙 (docs/decisions.md 기록)
// - advanced:     커밋 300+ AND (PR 20+ 또는 기여 레포 3+). AND로 묶으면 자기 레포 위주 활동자는 영영 도달 못 함
// - intermediate: 커밋 50+ 또는 PR 5+ 또는 타인 레포 기여 1+
// - beginner:     그 외
function judgeSkillLevel({ commits, pullRequests, contributedRepos }) {
    if (commits >= 300 && (pullRequests >= 20 || contributedRepos >= 3)) {
        return 'advanced';
    }
    if (commits >= 50 || pullRequests >= 5 || contributedRepos >= 1) {
        return 'intermediate';
    }
    return 'beginner';
}

// 언어별 커밋 가중치 → 명세의 languages 형식 [{ name, ratio }] (비율 내림차순, 소수 2자리)
function toLanguageRatios(languageWeights) {
    const totalWeight = languageWeights.reduce((sum, { weight }) => sum + weight, 0);
    if (totalWeight === 0) {
        return [];
    }
    return languageWeights
        .map(({ name, weight }) => ({
            name,
            ratio: Math.round((weight / totalWeight) * 100) / 100,
        }))
        .filter(({ ratio }) => ratio >= 0.01); // 반올림 후 0%가 되는 꼬리 언어는 노이즈라 제외
}

// analyses 테이블 레코드 → 명세(Analysis 스키마) 응답 형태
function toAnalysisResponse(record) {
    return {
        githubId: record.githubId,
        languages: record.languages,
        skillLevel: record.skillLevel,
        activitySummary: record.activitySummary,
        recentRepos: record.recentRepos,
        contributionHistory: record.contributionHistory,
        analyzedAt: record.analyzedAt.toISOString(),
    };
}

// 캐시 조회. GitHub 로그인은 대소문자 무관이라 insensitive 비교
// DB 장애 시 null(캐시 미스) 반환 — 서버는 DB 없이도 동작해야 함
async function findCachedAnalysis(githubId) {
    try {
        return await prisma.analysis.findFirst({
            where: { githubId: { equals: githubId, mode: 'insensitive' } },
        });
    } catch (error) {
        logger.warn('분석 캐시 조회 실패 — 캐시 없이 진행:', { error: error.message, githubId });
        return null;
    }
}

// 분석 결과 저장(upsert). 실패해도 로그만 남기고 응답엔 영향 없음
async function saveAnalysis(githubId, data) {
    try {
        return await prisma.analysis.upsert({
            where: { githubId },
            update: data,
            create: { githubId, ...data },
        });
    } catch (error) {
        logger.warn('분석 캐시 저장 실패 — 응답은 정상 반환:', { error: error.message, githubId });
        return null;
    }
}

// GitHub ID → 프로필 분석 결과. 24시간 캐시 있으면 재사용, 없으면 새로 분석 후 갱신
export async function createAnalysis(githubId) {
    const cached = await findCachedAnalysis(githubId);
    if (cached && Date.now() - cached.analyzedAt.getTime() < CACHE_TTL_MS) {
        logger.info('분석 캐시 재사용', { githubId: cached.githubId, analyzedAt: cached.analyzedAt });
        return toAnalysisResponse(cached);
    }

    const profile = await fetchUserProfile(githubId);

    const activitySummary = {
        commits: profile.totals.commits,
        pullRequests: profile.totals.pullRequests,
        issues: profile.totals.issues,
        contributedRepos: profile.totals.contributedRepos,
    };

    // 캐시 키는 GitHub 정식 표기(user.login) 사용, 대소문자 다른 요청도 한 행으로 모음
    const analysisData = {
        languages: toLanguageRatios(profile.languageWeights),
        skillLevel: judgeSkillLevel(activitySummary),
        activitySummary,
        recentRepos: profile.recentRepos.slice(0, 10),
        contributionHistory: profile.contributedRepos.slice(0, 10),
        analyzedAt: new Date(),
    };
    const saved = await saveAnalysis(profile.githubId, analysisData);

    logger.info('프로필 분석 완료', { githubId: profile.githubId, cached: Boolean(saved), ...activitySummary });

    return saved
        ? toAnalysisResponse(saved)
        : toAnalysisResponse({ githubId: profile.githubId, ...analysisData });
}

// 저장된 분석 조회 (GET /api/analysis/:githubId)
// - 이력 없음 → 404 ANALYSIS_NOT_FOUND
// - 7일 이내 → 저장본 그대로 반환
// - 7일 초과 → 재분석 후 갱신본 반환
export async function getAnalysis(githubId) {
    const record = await findCachedAnalysis(githubId);
    if (!record) {
        const notFound = new Error('분석 이력이 없습니다. 먼저 분석을 실행해주세요.');
        notFound.status = 404;
        notFound.code = 'ANALYSIS_NOT_FOUND';
        throw notFound;
    }
    if (Date.now() - record.analyzedAt.getTime() > STALE_MS) {
        logger.info('저장 분석 7일 경과, 재분석 실행', { githubId: record.githubId, analyzedAt: record.analyzedAt });
        return createAnalysis(githubId);
    }
    return toAnalysisResponse(record);
}
