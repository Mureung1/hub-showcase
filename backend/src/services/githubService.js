import { GraphqlResponseError } from '@octokit/graphql';

import githubGraphql from '../config/github.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('githubService');

// 프로필 원시 데이터를 GraphQL 쿼리 1개로 수집 (REST로 하면 레포마다 언어 조회가 필요한 N+1 구조)
// - repositories: 본인 소유·비포크 레포의 언어별 바이트 크기 (언어 비율 계산의 원천)
//   최대 100개까지만 조회하므로 최근 푸시 순으로 정렬해 최신 활동 레포가 우선 집계되도록 한다
// - pullRequests/issues: 전체 누적 카운트
// - contributionsCollection.totalCommitContributions: 최근 1년 커밋 수
//   (전체 커밋 수는 레포별 히스토리 조회가 필요해 N+1이 되므로, 활동성 지표로는 최근 1년으로 충분하다고 판단)
// - repositoriesContributedTo: 기여한 타인 레포 수 (skillLevel 판정용)
const PROFILE_QUERY = `
    query userProfile($login: String!) {
        user(login: $login) {
            login
            repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
                totalCount
                nodes {
                    languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                        edges {
                            size
                            node {
                                name
                            }
                        }
                    }
                }
            }
            pullRequests {
                totalCount
            }
            issues {
                totalCount
            }
            contributionsCollection {
                totalCommitContributions
            }
            repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST]) {
                totalCount
            }
        }
    }
`;

// GraphQL 에러를 openapi.yaml 공통 에러 형식(status/code)으로 변환
// 매핑 규칙(openapi.yaml 상단): 없는 유저 → 404 USER_NOT_FOUND, rate limit 초과 → 429 RATE_LIMITED
function toHttpError(error, githubId) {
    if (error instanceof GraphqlResponseError) {
        const types = (error.errors || []).map((e) => e.type);
        if (types.includes('NOT_FOUND')) {
            const notFound = new Error('존재하지 않는 GitHub 사용자입니다.');
            notFound.status = 404;
            notFound.code = 'USER_NOT_FOUND';
            return notFound;
        }
        if (types.includes('RATE_LIMITED')) {
            const rateLimited = new Error('GitHub API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
            rateLimited.status = 429;
            rateLimited.code = 'RATE_LIMITED';
            return rateLimited;
        }
    }
    logger.error('GitHub 프로필 조회 실패:', { error: error.message, status: error.status, githubId });

    // GraphQL 외 HTTP 에러(토큰 누락/만료 401 등)는 error.status가 그대로 응답에 실리지 않도록
    // status 없는 에러로 감싸서 전역 에러 핸들러가 500 INTERNAL_ERROR로 처리하게 한다
    const internal = new Error(`GitHub API 호출 실패: ${error.message}`);
    return internal;
}

// GitHub 사용자 프로필 원시 데이터 조회
// 반환: { githubId, languageSizes: [{ name, size }], totals: { commits, pullRequests, issues, contributedRepos, ownRepos } }
// 활동이 없는 사용자(레포/커밋 0)도 에러가 아니라 0/빈 배열로 정상 반환한다 (명세 noActivity 케이스)
export async function fetchUserProfile(githubId) {
    let user;
    try {
        ({ user } = await githubGraphql(PROFILE_QUERY, { login: githubId }));
    } catch (error) {
        throw toHttpError(error, githubId);
    }

    // 레포별 언어 바이트를 언어 이름 기준으로 합산 (비율 계산은 analysisService 담당)
    const sizeByLanguage = new Map();
    for (const repo of user.repositories.nodes) {
        for (const { size, node } of repo.languages.edges) {
            sizeByLanguage.set(node.name, (sizeByLanguage.get(node.name) || 0) + size);
        }
    }
    const languageSizes = [...sizeByLanguage]
        .map(([name, size]) => ({ name, size }))
        .sort((a, b) => b.size - a.size);

    return {
        githubId: user.login,
        languageSizes,
        totals: {
            commits: user.contributionsCollection.totalCommitContributions,
            pullRequests: user.pullRequests.totalCount,
            issues: user.issues.totalCount,
            contributedRepos: user.repositoriesContributedTo.totalCount,
            ownRepos: user.repositories.totalCount,
        },
    };
}
