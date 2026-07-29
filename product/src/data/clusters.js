// 기업군 6종. 화면 세 곳에 복제돼 있던 배열을 여기 하나로 모았다.
// 값은 마이그레이션 0002_seed_reference.sql 의 company_clusters.display_name 과 같다.
// 계약(CONTRACT 5장 B)이 scope.cluster_tag 를 기업군 "표시명" 문자열로 정의하므로 표시명을 그대로 쓴다.
//
// 배열 순서는 기본 기업군을 앞에 두는 화면 표시 순서다.
// (DB 의 sort_order 는 빅테크·플랫폼 → 스타트업 → B2B SaaS → 핀테크·금융 → SI·대기업 → 게임사)
export const CLUSTERS = [
  '핀테크·금융',
  '빅테크·플랫폼',
  '스타트업',
  'B2B SaaS',
  'SI·대기업',
  '게임사',
]

// 기업군을 아직 고르지 않았을 때 쓰는 기본값. 화면마다 따로 적지 않는다.
export const DEFAULT_CLUSTER = CLUSTERS[0]

// 범위(scope) 초기값. 직무를 바꾸면 공고 선택이 무의미해지므로 이 값으로 되돌린다.
export const defaultScope = () => ({ level: 'cluster', cluster_tag: DEFAULT_CLUSTER, posting_id: null })
