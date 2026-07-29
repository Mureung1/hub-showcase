import { useEffect, useState } from 'react'
import { fetchJson } from './apiFetch'

// 직무의 공고 목록을 서버에서 받는다(GET /api/postings?job=).
//
// 공고 선택지는 기업군에 매이지 않는다. 예전에는 화면이 받은 payload 의
// `postings_in_cluster` 를 썼는데, 그러면 지금 고른 기업군의 공고만 보여서 공고 하나를
// 찾으려면 기업군을 하나씩 눌러 봐야 했다. 이제 직무의 공고 전체를 한 번에 받고,
// 어느 기업군 공고인지는 줄마다 실려 오는 `cluster_tag` 로 보여 준다.
//
// 세 화면(해석·합격 전략·준비 로드맵)이 같은 훅을 쓴다. 목록은 범위와 무관하므로
// 범위를 바꿔도 다시 받지 않는다 — 직무가 바뀔 때만 다시 받는다.
//
// 받은 결과에 어느 직무 것인지를 함께 담아 둔다. 직무가 바뀐 직후에는 아직 이전 직무의
// 목록이 남아 있는데, 그것을 새 직무의 공고인 양 보여 주면 안 되기 때문이다.
// 효과 본문에서 상태를 비우는 대신 읽는 자리에서 걸러 낸다(불필요한 재렌더를 만들지 않는다).
//
// 반환: { postings, status } — status 는 loading | ready | empty | error
export default function usePostings(jobRoleId) {
  const [result, setResult] = useState({ job: null, postings: [], status: 'loading' })

  useEffect(() => {
    if (!jobRoleId) return undefined
    const controller = new AbortController()
    fetchJson(`/api/postings?job=${encodeURIComponent(jobRoleId)}`, { signal: controller.signal })
      .then((json) => {
        // 계약은 배열을 내지만, 감싼 형태로 와도 목록만 꺼내 쓴다.
        const list = Array.isArray(json) ? json : (json && Array.isArray(json.postings) ? json.postings : [])
        setResult({ job: jobRoleId, postings: list, status: list.length === 0 ? 'empty' : 'ready' })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        // 분석 결과가 없는 직무(503)도 여기로 온다. 화면은 오류를 떠들지 않고
        // "분석된 개별 공고가 없습니다" 한 줄로 조용히 알린다.
        setResult({ job: jobRoleId, postings: [], status: 'error' })
      })
    return () => controller.abort()
  }, [jobRoleId])

  if (!jobRoleId) return { postings: [], status: 'empty' }
  if (result.job !== jobRoleId) return { postings: [], status: 'loading' }
  return { postings: result.postings, status: result.status }
}
