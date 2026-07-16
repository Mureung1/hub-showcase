import { GraphqlResponseError } from '@octokit/graphql';

import githubGraphql from '../config/github.js';
import { recordGithubCall } from './apiUsageService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('githubService');

// "진짜 외부 기여"로 인정하는 최소 스타 수 — 소속 조직 멤버십이 비공개면 조직 필터가 새는데,
// 학교 팀프로젝트류는 스타가 거의 없으므로 스타 컷이 백스톱 역할을 한다 (2026-07-15 논의)
const EXTERNAL_STAR_MIN = 10;

// 프로필 원시 데이터를 GraphQL 쿼리 1개로 수집 (REST로 하면 레포마다 언어 조회가 필요한 N+1 구조)
// - commitContributionsByRepository: 최근 12개월간 실제 커밋한 레포(소유·조직·팀 레포 포함)와
//   레포별 커밋 수 + 언어 구성. 언어 비율은 이 커밋 수로 가중 평균한다 —
//   레포에 쌓인 코드 용량이 아니라 "최근에 실제로 작성한 언어"가 반영되도록 (분석중 화면 문구와 일치)
// - pullRequests/issues: 전체 누적 카운트
// - contributionsCollection.totalCommitContributions: 최근 1년 커밋 수
//   (전체 커밋 수는 레포별 히스토리 조회가 필요해 N+1이 되므로, 활동성 지표로는 최근 1년으로 충분하다고 판단)
// - repositoriesContributedTo: 본인 소유가 아닌 레포 기여 이력 — 기간 제한이 없어 오래된 오픈소스 기여도 유지됨.
//   개수는 skillLevel 판정, 목록(레포명+스타 수)은 프로필 "기여 이력" 표시용
const PROFILE_QUERY = `
    query userProfile($login: String!) {
        user(login: $login) {
            login
            repositories(ownerAffiliations: OWNER, isFork: false) {
                totalCount
            }
            pullRequests {
                totalCount
            }
            issues {
                totalCount
            }
            contributionsCollection {
                totalCommitContributions
                commitContributionsByRepository(maxRepositories: 100) {
                    contributions {
                        totalCount
                    }
                    repository {
                        nameWithOwner
                        owner {
                            login
                        }
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
            }
            repositoriesContributedTo(first: 50, contributionTypes: [COMMIT, PULL_REQUEST], orderBy: { field: STARGAZERS, direction: DESC }) {
                totalCount
                nodes {
                    nameWithOwner
                    stargazerCount
                }
            }
            organizations(first: 100) {
                nodes {
                    login
                }
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
// 반환: { githubId, languageWeights: [{ name, weight }], recentRepos: [{ nameWithOwner, commits }](최근 1년 커밋한 본인·소속 조직 레포),
//        contributedRepos: [{ nameWithOwner, stars }](외부 기여·평생·스타순), totals: { commits, pullRequests, issues, contributedRepos, ownRepos } }
// 활동이 없는 사용자(레포/커밋 0)도 에러가 아니라 0/빈 배열로 정상 반환한다 (명세 noActivity 케이스)
export async function fetchUserProfile(githubId) {
    let user;
    try {
        ({ user } = await githubGraphql(PROFILE_QUERY, { login: githubId }));
    } catch (error) {
        throw toHttpError(error, githubId);
    } finally {
        // 404(없는 유저)든 성공이든 GitHub rate limit은 소모되므로 결과와 무관하게 집계한다.
        // 기록 실패는 apiUsageService가 삼키므로 await로 본 흐름이 늦어질 이유가 없다 (fire-and-forget)
        recordGithubCall();
    }

    // "진짜 외부 기여" 판별: 본인 소유도, 소속 조직 소유도 아닌 레포 + 스타 컷 통과
    // (GitHub은 소속 조직 레포도 '타인 소유'로 취급하므로 팀프로젝트가 기여 이력에 섞이는 것을 거른다)
    const myLogins = new Set([
        user.login.toLowerCase(),
        ...user.organizations.nodes.map((org) => org.login.toLowerCase()),
    ]);
    const isExternal = (nameWithOwner, stars) =>
        !myLogins.has(nameWithOwner.split('/')[0].toLowerCase()) && stars >= EXTERNAL_STAR_MIN;

    // GraphQL orderBy(STARGAZERS)가 정렬을 보장하지 않는 것이 확인되어 여기서 직접 정렬한다
    // (상위 N개만 노출할 때 유명 오픈소스 기여가 잘리지 않도록 정렬이 slice보다 먼저여야 함)
    const externalContributions = user.repositoriesContributedTo.nodes
        .map((repo) => ({ nameWithOwner: repo.nameWithOwner, stars: repo.stargazerCount }))
        .filter((repo) => isExternal(repo.nameWithOwner, repo.stars))
        .sort((a, b) => b.stars - a.stars);
    const externalNames = new Set(externalContributions.map((repo) => repo.nameWithOwner));

    // 커밋한 레포마다 "언어 구성 비율 × 그 레포 커밋 수"를 언어별로 합산 (커밋 가중 평균)
    // 레포 안의 언어 구성은 바이트 크기로밖에 알 수 없지만, 레포 간 비중은 커밋 수가 정한다
    const weightByLanguage = new Map();
    const recentRepos = [];
    for (const { contributions, repository } of user.contributionsCollection.commitContributionsByRepository) {
        const repoCommits = contributions.totalCount;
        if (repoCommits === 0) continue;

        // "최근 12개월 활동 레포" = 실제로 커밋한 모든 레포 (본인 + 소속 조직).
        // 외부 기여로 분류된 레포는 기여 이력 섹션에만 두어 중복을 피한다
        if (!externalNames.has(repository.nameWithOwner)) {
            recentRepos.push({ nameWithOwner: repository.nameWithOwner, commits: repoCommits });
        }

        const repoTotalSize = repository.languages.edges.reduce((sum, { size }) => sum + size, 0);
        if (repoTotalSize === 0) continue;
        for (const { size, node } of repository.languages.edges) {
            const weighted = repoCommits * (size / repoTotalSize);
            weightByLanguage.set(node.name, (weightByLanguage.get(node.name) || 0) + weighted);
        }
    }
    const languageWeights = [...weightByLanguage]
        .map(([name, weight]) => ({ name, weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        githubId: user.login,
        languageWeights,
        recentRepos: recentRepos.sort((a, b) => b.commits - a.commits),
        contributedRepos: externalContributions,
        totals: {
            commits: user.contributionsCollection.totalCommitContributions,
            pullRequests: user.pullRequests.totalCount,
            issues: user.issues.totalCount,
            contributedRepos: user.repositoriesContributedTo.totalCount,
            ownRepos: user.repositories.totalCount,
        },
    };
}
