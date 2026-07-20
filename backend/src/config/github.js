import { graphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';

import config from './index.js';

// GitHub GraphQL 클라이언트 싱글턴 — 서비스 레이어는 반드시 이 인스턴스를 import해 사용한다
// 토큰이 없으면 비인증 호출이 아니라 GraphQL API 자체가 거부되므로 부팅 시점이 아닌
// 실제 호출 시점에 에러가 나도록 그대로 둔다 (서버는 토큰 없이도 부팅 가능해야 함)
const githubGraphql = graphql.defaults({
    headers: {
        authorization: `bearer ${config.githubToken}`,
    },
});

// GitHub REST 클라이언트 싱글턴 — qualifier 기반 이슈 검색(search API)에 사용한다.
// 레포 상세는 GraphQL 일괄 조회가 담당하므로(N+1 회피) REST는 검색 전용이다
export const githubRest = new Octokit({
    auth: config.githubToken || undefined,
});

export default githubGraphql;
