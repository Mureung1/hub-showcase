export const trackTopicKeywords = {
  frontend: {
    topics: ['react'],
    keywords: /(frontend|front-end|프론트|react|리액트|html|css|javascript|자바스크립트)/i,
  },
  backend: {
    topics: ['backend'],
    keywords: /(backend|back-end|백엔드|api|server|서버|fastapi|db|database|데이터베이스)/i,
  },
  fullstack: {
    topics: ['react', 'backend'],
    keywords: /(fullstack|full-stack|풀스택)/i,
  },
  devops: {
    topics: ['docker'],
    keywords: /(devops|dev ops|데브옵스|인프라|sre|cloud|클라우드|docker|도커|platform|플랫폼)/i,
  },
  'software-engineer': {
    topics: ['software-engineer'],
    keywords: /(software engineer|소프트웨어|cs|computer science|알고리즘|자료구조|설계|architecture|아키텍처)/i,
  },
}

export function inferTrackTopics(goal) {
  const normalized = String(goal ?? '')
  const matched = Object.values(trackTopicKeywords).find((entry) => entry.keywords.test(normalized))

  return matched ? matched.topics : []
}
