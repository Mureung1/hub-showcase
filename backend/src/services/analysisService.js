import prisma from '../config/prisma.js';
import { fetchUserProfile } from './githubService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('analysisService');

// 분석 캐시 유효 시간 — 이내 재요청은 GitHub 호출 없이 저장된 결과 재사용 (openapi.yaml 명세)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// skillLevel 판정 규칙 (docs/decisions.md 기록)
// - advanced:     커밋 300+ 그리고 (PR 20+ 또는 기여 레포 3+) — 협업 신호는 둘 중 하나면 충분
//                 (자기 레포 위주로 활동하면 contributedRepos가 0이라 AND 조건은 영원히 못 닿음)
// - intermediate: 커밋 50+ 또는 PR 5+ 또는 타인 레포 기여 1+ (혼자서라도 개발 이력 있음)
// - beginner:     그 외 (활동 없는 사용자 포함 — 명세의 빈 분석 케이스)
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

// 캐시 조회 — GitHub 로그인은 대소문자를 구분하지 않으므로 insensitive 비교로 찾는다
// (kimsunho2000으로 분석한 뒤 KimSunHo2000으로 요청해도 같은 캐시를 써야 함)
// DB 장애는 분석 실패로 번지지 않게 null(캐시 미스)로 처리한다 — 서버는 DB 없이도 동작해야 함
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

// 분석 결과 저장(upsert) — 저장 실패도 응답 실패로 번지지 않게 로그만 남긴다
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

// GitHub ID → 프로필 분석 결과 (openapi.yaml Analysis 스키마)
// 24시간 이내 캐시가 있으면 GitHub 호출 없이 재사용하고, 아니면 새로 분석해 캐시를 갱신한다
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

    // 캐시 키는 GitHub이 돌려준 정식 표기(user.login)를 쓴다 — 입력 대소문자에 따라 행이 갈라지지 않게
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

// 저장된 분석 조회 (GET /api/analysis/:githubId — 프로필 화면 새로고침용, GitHub 호출 없음)
// 신선도와 무관하게 마지막 분석을 돌려주고, 이력이 없으면 404 ANALYSIS_NOT_FOUND를 던진다
export async function getAnalysis(githubId) {
    const record = await findCachedAnalysis(githubId);
    if (!record) {
        const notFound = new Error('분석 이력이 없습니다. 먼저 분석을 실행해주세요.');
        notFound.status = 404;
        notFound.code = 'ANALYSIS_NOT_FOUND';
        throw notFound;
    }
    return toAnalysisResponse(record);
}
