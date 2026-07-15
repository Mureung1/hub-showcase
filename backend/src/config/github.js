import { graphql } from '@octokit/graphql';

import config from './index.js';

// GitHub GraphQL 클라이언트 싱글턴 — 서비스 레이어는 반드시 이 인스턴스를 import해 사용한다
// 토큰이 없으면 비인증 호출이 아니라 GraphQL API 자체가 거부되므로 부팅 시점이 아닌
// 실제 호출 시점에 에러가 나도록 그대로 둔다 (서버는 토큰 없이도 부팅 가능해야 함)
const githubGraphql = graphql.defaults({
    headers: {
        authorization: `bearer ${config.githubToken}`,
    },
});

export default githubGraphql;
