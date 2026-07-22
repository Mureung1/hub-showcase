// 테스트용 Supabase 스텁. 실제 Supabase를 절대 호출하지 않게 하기 위한 것으로,
// vi.mock('../lib/supabase.js') 팩토리 안에서 쓴다.
//
// supabase-js의 쿼리는 .from().select().eq()... 처럼 체이닝되다가 await될 때 결과가 나온다.
// 그래서 모든 체이닝 메서드가 자기 자신을 돌려주고, then()에서 result를 내주는 thenable로 만든다.
// 테스트에서는 `supabase.query.result = { data, error }` 로 응답을 바꾼다.

const CHAINABLE = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'gte',
  'order',
  'limit',
  'range',
  'single',
]

export function createSupabaseMock() {
  const query = {
    result: { data: [], error: null },
    // 한 요청이 여러 번 질의할 때(예: 한도 조회 → 문서 조회) 순서대로 꺼내 쓴다.
    // 비면 result 로 돌아간다.
    results: [],
    calls: [],
  }

  for (const method of CHAINABLE) {
    query[method] = (...args) => {
      query.calls.push([method, ...args])
      return query
    }
  }

  query.then = (resolve, reject) => {
    const next = query.results.length > 0 ? query.results.shift() : query.result
    return Promise.resolve(next).then(resolve, reject)
  }

  return {
    from: (table) => {
      query.calls.push(['from', table])
      return query
    },
    auth: {
      // 로그인 작업에서 requireAuth 미들웨어 테스트에 쓴다.
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    query,
  }
}
