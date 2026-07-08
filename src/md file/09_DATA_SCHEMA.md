<html>
<body>
<!--StartFragment--><html><head></head><body><h1>📄 09_DATA_SCHEMA.md</h1><h1>AI Portfolio Agent</h1><hr><h1>1. 문서 목적</h1><p>본 문서는 AI Portfolio Agent에서 사용하는 공통 데이터 구조(Data Contract)를 정의한다.</p><p>Data Schema는 Frontend, Backend, AI Agent, Database가 동일한 구조의 데이터를 주고받기 위한 표준 규격이다.</p><p>모든 새로운 기능과 AI Agent는 본 문서에 정의된 Schema를 준수해야 한다.</p><hr><h1>2. 설계 원칙</h1><h2>2.1 Single Source of Truth</h2><p>동일한 데이터는 하나의 Schema만 정의한다.</p><p>예를 들어 Project Metadata는 GitHub Analyzer, Matching Agent, Portfolio Generator가 모두 동일한 구조를 사용한다.</p><hr><h2>2.2 Structured Data First</h2><p>Agent 간 데이터 전달은 자연어가 아닌 JSON 기반 구조화 데이터를 사용한다.</p><hr><h2>2.3 Schema Versioning</h2><p>모든 주요 Schema는 버전 관리가 가능하도록 설계한다.</p><pre><code class="language-json">{
  "schema_version": "1.0.0"
}
</code></pre><hr><h1>3. 공통 Base Schema</h1><p>모든 Schema는 다음 공통 필드를 포함한다.</p><pre><code class="language-json">{
  "id": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "schema_version": "1.0.0"
}
</code></pre><hr><h1>4. ProjectMetadataSchema</h1><p>GitHub Analyzer의 최종 결과이다.</p><pre><code class="language-json">{
  "project_name": "AI Portfolio Agent",
  "description": "기업 맞춤형 포트폴리오 생성 서비스",
  "purpose": "취업 포트폴리오 자동 생성",
  "tech_stack": {
    "language": ["Python"],
    "framework": ["FastAPI", "Next.js"],
    "database": ["PostgreSQL"],
    "infra": ["Docker"]
  },
  "features": [
    "GitHub 분석",
    "JD 매칭",
    "Portfolio 생성"
  ],
  "architecture": {
    "type": "Layered",
    "confidence": 0.87
  },
  "evidence": [],
  "analysis_confidence": 0.91
}
</code></pre><hr><h1>5. EvidenceSchema</h1><p>모든 AI 생성 결과의 근거를 표현한다.</p><pre><code class="language-json">{
  "claim": "Redis Cache 적용",
  "sources": [
    {
      "file": "README.md",
      "start_line": 40,
      "end_line": 58
    },
    {
      "file": "RedisConfig.java"
    }
  ],
  "confidence": 0.94
}
</code></pre><hr><h1>6. ResumeSchema</h1><p>이력서 분석 결과이다.</p><pre><code class="language-json">{
  "projects": [
    {
      "name": "AI Portfolio Agent",
      "role": "Backend Developer",
      "period": {
        "start": "2024-01",
        "end": "2024-05"
      },
      "tech_stack": [
        "Python",
        "FastAPI"
      ],
      "achievements": [
        "AI 기반 포트폴리오 자동 생성"
      ]
    }
  ]
}
</code></pre><hr><h1>7. JDMetadataSchema</h1><p>채용공고 분석 결과이다.</p><pre><code class="language-json">{
  "company": "Example Company",
  "position": "Backend Developer",
  "required_skills": [
    "Spring Boot",
    "Redis"
  ],
  "preferred_skills": [
    "Docker"
  ],
  "keywords": [
    "MSA",
    "성능 개선"
  ],
  "responsibilities": [
    "API 개발",
    "서비스 운영"
  ]
}
</code></pre><hr><h1>8. CandidateProjectSchema</h1><p>Project Retriever가 반환하는 후보 프로젝트 목록이다.</p><pre><code class="language-json">{
  "project_id": "project_001",
  "score": 0.92,
  "reason": [
    "Redis 경험 일치",
    "Docker 경험 일치"
  ]
}
</code></pre><hr><h1>9. MatchingResultSchema</h1><p>Matching Agent의 출력 결과이다.</p><pre><code class="language-json">{
  "selected_projects": [
    "project_001"
  ],
  "highlight_points": [
    "Caching",
    "MSA"
  ],
  "matching_reason": "JD 요구사항과 가장 높은 기술 적합도를 보임"
}
</code></pre><hr><h1>10. PortfolioSchema</h1><p>Portfolio Generator의 최종 결과이다.</p><pre><code class="language-json">{
  "title": "AI Portfolio",
  "slides": [
    {
      "title": "Project Overview",
      "content": "프로젝트 소개",
      "evidence": [
        "README.md"
      ]
    }
  ]
}
</code></pre><hr><h1>11. AgentStateSchema</h1><p>LangGraph 등에서 사용할 공통 상태 객체이다.</p><pre><code class="language-json">{
  "user": {},
  "resume": {},
  "project_library": [],
  "jd": {},
  "candidate_projects": [],
  "matching_result": {},
  "portfolio": {},
  "review": {}
}
</code></pre><p>모든 Agent는 필요한 필드만 읽고 자신의 결과만 갱신한다.</p><hr><h1>12. ErrorSchema</h1><p>공통 오류 응답 형식이다.</p><pre><code class="language-json">{
  "error": {
    "code": "GITHUB_ANALYSIS_FAILED",
    "message": "Repository 분석에 실패했습니다.",
    "detail": "README.md를 찾을 수 없습니다."
  }
}
</code></pre><hr><h1>13. API Response Schema</h1><p>모든 API는 동일한 응답 형식을 사용한다.</p><pre><code class="language-json">{
  "success": true,
  "data": {},
  "error": null
}
</code></pre><p>실패 시</p><pre><code class="language-json">{
  "success": false,
  "data": null,
  "error": {}
}
</code></pre><hr><h1>14. 확장 규칙</h1><p>새로운 Agent를 추가할 경우</p><ul><li><p>기존 Schema를 수정하기보다 확장한다.</p></li><li><p>기존 필드는 삭제하지 않는다.</p></li><li><p>새로운 필드는 Optional로 추가한다.</p></li><li><p>Major 변경 시 <code inline="">schema_version</code>을 증가시킨다.</p></li></ul><hr><h1>15. 구현 가이드</h1><p>각 계층은 동일한 Schema를 사용한다.</p>
계층 | 구현 방식
-- | --
Backend | Pydantic Model
Frontend | TypeScript Interface 또는 Zod Schema
AI Agent | LangGraph State / JSON
Database | PostgreSQL JSONB 또는 ORM Model
API | OpenAPI Schema

<hr><h1>16. 핵심 설계 요약</h1><p>AI Portfolio Agent의 Data Schema는 프로젝트 전체의 데이터 계약(Data Contract)이다.</p><p>모든 컴포넌트는 동일한 Schema를 기반으로 데이터를 주고받으며, 이를 통해 다음 목표를 달성한다.</p><ul><li><p>데이터 일관성 유지</p></li><li><p>AI Agent 간 호환성 확보</p></li><li><p>API와 Frontend의 타입 일치</p></li><li><p>유지보수 비용 절감</p></li><li><p>새로운 Agent 및 기능의 확장성 확보</p></li></ul><p>Data Schema는 프로젝트 전체에서 <strong>Single Source of Truth</strong> 역할을 수행하며, 시스템의 장기적인 확장성과 안정성을 보장하는 핵심 설계 문서이다.</p></body></html><!--EndFragment-->
</body>
</html>