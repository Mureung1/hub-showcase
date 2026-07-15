import { fetchUserProfile } from './githubService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('analysisService');

// skillLevel 판정 규칙 (docs/decisions.md 기록)
// - advanced:     커밋 300+ 그리고 PR 20+ 그리고 기여 레포 3+ (꾸준한 협업 이력)
// - intermediate: 커밋 50+ 또는 PR 5+ 또는 타인 레포 기여 1+ (혼자서라도 개발 이력 있음)
// - beginner:     그 외 (활동 없는 사용자 포함 — 명세의 빈 분석 케이스)
function judgeSkillLevel({ commits, pullRequests, contributedRepos }) {
    if (commits >= 300 && pullRequests >= 20 && contributedRepos >= 3) {
        return 'advanced';
    }
    if (commits >= 50 || pullRequests >= 5 || contributedRepos >= 1) {
        return 'intermediate';
    }
    return 'beginner';
}

// 언어별 바이트 크기 → 명세의 languages 형식 [{ name, ratio }] (비율 내림차순, 소수 2자리)
function toLanguageRatios(languageSizes) {
    const totalSize = languageSizes.reduce((sum, { size }) => sum + size, 0);
    if (totalSize === 0) {
        return [];
    }
    return languageSizes.map(({ name, size }) => ({
        name,
        ratio: Math.round((size / totalSize) * 100) / 100,
    }));
}

// GitHub ID → 프로필 분석 결과 (openapi.yaml Analysis 스키마)
// 캐시(analyses 테이블) 저장은 이슈 #5 금요일분에서 추가 예정 — 지금은 매 호출마다 GitHub 조회
export async function createAnalysis(githubId) {
    const profile = await fetchUserProfile(githubId);

    const activitySummary = {
        commits: profile.totals.commits,
        pullRequests: profile.totals.pullRequests,
        issues: profile.totals.issues,
        contributedRepos: profile.totals.contributedRepos,
    };

    logger.info('프로필 분석 완료', { githubId: profile.githubId, ...activitySummary });

    return {
        githubId: profile.githubId,
        languages: toLanguageRatios(profile.languageSizes),
        skillLevel: judgeSkillLevel(activitySummary),
        activitySummary,
        analyzedAt: new Date().toISOString(),
    };
}
