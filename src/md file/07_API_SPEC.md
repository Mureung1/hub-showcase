<html>
<body>
<!--StartFragment--><html><head></head><body><h1>📄 07_API_SPEC.md</h1><h1>AI Portfolio Agent</h1><hr><h1>1. 문서 목적</h1><p>본 문서는 AI Portfolio Agent의 API 명세를 정의한다.</p><p>API는 Frontend, Backend, AI Agent 간의 통신 규격을 정의하며, 모든 요청과 응답은 본 문서를 따른다.</p><p>AI 분석 작업은 일반적인 CRUD 요청이 아닌 <strong>비동기 Job 기반 처리</strong>를 원칙으로 한다.</p><hr><h1>2. API 설계 원칙</h1><h2>2.1 RESTful API</h2><p>리소스 중심 URI를 사용한다.</p><p>예시</p><pre><code class="language-text">GET /repositories

POST /repositories

GET /portfolios/{id}
</code></pre><hr><h2>2.2 JSON 기반 통신</h2><p>모든 요청과 응답은 JSON 형식을 사용한다.</p><hr><h2>2.3 비동기 AI 작업</h2><p>AI 분석 및 생성 작업은 Job을 생성하고 비동기로 처리한다.</p><pre><code class="language-text">Request

↓

Job Created

↓

Processing

↓

Completed

↓

Result
</code></pre><hr><h2>2.4 공통 응답 형식</h2><p>성공</p><pre><code class="language-json">{
  "success": true,
  "data": {},
  "error": null
}
</code></pre><p>실패</p><pre><code class="language-json">{
  "success": false,
  "data": null,
  "error": {
    "code": "",
    "message": ""
  }
}
</code></pre><hr><h1>3. 인증(Authentication)</h1><p>MVP에서는 JWT 기반 인증을 사용한다.</p><p>Header</p><pre><code class="language-text">Authorization: Bearer &lt;token&gt;
</code></pre><hr><h1>4. Repository API</h1><h2>Repository 등록</h2><h3>POST</h3><pre><code class="language-text">/api/v1/repositories
</code></pre><h3>Request</h3><pre><code class="language-json">{
  "repository_url": "https://github.com/user/project"
}
</code></pre><h3>Response</h3><pre><code class="language-json">{
  "repository_id": "repo_001"
}
</code></pre><hr><h2>Repository 목록 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/repositories
</code></pre><hr><h2>Repository 상세 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/repositories/{repositoryId}
</code></pre><hr><h2>Repository 삭제</h2><h3>DELETE</h3><pre><code class="language-text">/api/v1/repositories/{repositoryId}
</code></pre><hr><h1>5. GitHub Analyzer API</h1><h2>분석 시작</h2><h3>POST</h3><pre><code class="language-text">/api/v1/repositories/{repositoryId}/analyze
</code></pre><h3>Response</h3><pre><code class="language-json">{
  "job_id": "job_001",
  "status": "PENDING"
}
</code></pre><hr><h2>분석 결과 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/repositories/{repositoryId}/metadata
</code></pre><h3>Response</h3><p>ProjectMetadataSchema</p><hr><h1>6. Resume API</h1><h2>이력서 업로드</h2><h3>POST</h3><pre><code class="language-text">/api/v1/resumes
</code></pre><p>multipart/form-data 사용</p><hr><h2>이력서 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/resumes
</code></pre><hr><h2>이력서 분석</h2><h3>POST</h3><pre><code class="language-text">/api/v1/resumes/{resumeId}/analyze
</code></pre><p>Response</p><pre><code class="language-json">{
  "job_id": "job_resume_001"
}
</code></pre><hr><h1>7. Job Description API</h1><h2>JD 등록</h2><h3>POST</h3><pre><code class="language-text">/api/v1/job-descriptions
</code></pre><p>Request</p><pre><code class="language-json">{
  "company": "Example",
  "position": "Backend Developer",
  "jd_text": "..."
}
</code></pre><hr><h2>JD 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/job-descriptions
</code></pre><hr><h2>JD 분석</h2><h3>POST</h3><pre><code class="language-text">/api/v1/job-descriptions/{jdId}/analyze
</code></pre><hr><h1>8. Matching API</h1><h2>프로젝트 매칭</h2><h3>POST</h3><pre><code class="language-text">/api/v1/matching
</code></pre><p>Request</p><pre><code class="language-json">{
  "repository_ids": [
    "repo_001"
  ],
  "resume_id": "resume_001",
  "jd_id": "jd_001"
}
</code></pre><p>Response</p><p>MatchingResultSchema</p><hr><h1>9. Portfolio API</h1><h2>생성 요청</h2><h3>POST</h3><pre><code class="language-text">/api/v1/portfolios/generate
</code></pre><p>Request</p><pre><code class="language-json">{
  "jd_id": "jd_001",
  "project_ids": [
    "project_001"
  ]
}
</code></pre><p>Response</p><pre><code class="language-json">{
  "job_id": "job_portfolio_001"
}
</code></pre><hr><h2>목록 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/portfolios
</code></pre><hr><h2>상세 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}
</code></pre><hr><h2>수정</h2><h3>PUT</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}
</code></pre><hr><h2>삭제</h2><h3>DELETE</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}
</code></pre><hr><h1>10. Export API</h1><h2>Markdown 다운로드</h2><h3>GET</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}/export/md
</code></pre><hr><h2>PDF 다운로드</h2><h3>GET</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}/export/pdf
</code></pre><hr><h2>PPT 다운로드</h2><h3>GET</h3><pre><code class="language-text">/api/v1/portfolios/{portfolioId}/export/ppt
</code></pre><hr><h1>11. Job API</h1><p>AI 작업 진행 상태를 조회한다.</p><hr><h2>Job 조회</h2><h3>GET</h3><pre><code class="language-text">/api/v1/jobs/{jobId}
</code></pre><p>Response</p><pre><code class="language-json">{
  "job_id": "job_001",
  "status": "RUNNING",
  "progress": 65
}
</code></pre><p>status</p><ul><li><p>PENDING</p></li><li><p>RUNNING</p></li><li><p>COMPLETED</p></li><li><p>FAILED</p></li></ul><hr><h1>12. API ↔ Agent 매핑 표</h1><p>이 매핑 표는 Frontend, Backend, AI Agent 구현이 모두 같은 흐름을 기준으로 작업할 수 있도록 돕는다.</p>
API | 호출되는 Agent
-- | --
POST /repositories/{repositoryId}/analyze | GitHub Analyzer
POST /resumes/{resumeId}/analyze | Resume Analyzer
POST /job-descriptions/{jdId}/analyze | JD Analyzer
POST /matching | Matching Agent
POST /portfolios/generate | Story Planner → Portfolio Writer → Reviewer

<hr><h1>15. API Versioning</h1><p>모든 API는 버전을 포함한다.</p><p>예시</p><pre><code class="language-text">/api/v1/...
</code></pre><p>Breaking Change 발생 시</p><pre><code class="language-text">/api/v2/...
</code></pre><p>를 사용한다.</p><hr><h1>16. API 보안</h1><ul><li><p>HTTPS 사용</p></li><li><p>JWT 인증</p></li><li><p>CORS 설정</p></li><li><p>Rate Limit 적용</p></li><li><p>입력값 검증</p></li><li><p>파일 업로드 크기 제한</p></li></ul><hr><h1>17. API 실행 흐름</h1><pre><code class="language-text">Frontend

↓

Repository 등록

↓

GitHub Analyzer 실행

↓

Project Metadata 저장

↓

Resume 업로드

↓

JD 등록

↓

Matching 실행

↓

Portfolio 생성

↓

Export(PDF/PPT)
</code></pre><hr><h1>18. 향후 확장</h1><p>향후 다음 API를 추가할 수 있다.</p><ul><li><p>Interview API</p></li><li><p>Career Report API</p></li><li><p>Skill Gap Analysis API</p></li><li><p>Portfolio Feedback API</p></li><li><p>AI Chat API</p></li></ul><p>기존 API 구조를 변경하지 않고 확장 가능하도록 설계한다.</p><hr><h1>19. 핵심 설계 요약</h1><p>AI Portfolio Agent의 API는 <strong>AI 작업 중심(Job-Oriented) API</strong>를 지향한다.</p><p>모든 장시간 작업은 비동기 Job으로 실행되며, Frontend는 Job 상태를 조회하여 진행 상황을 표시한다.</p><p>API는 <code inline="">09_DATA_SCHEMA.md</code>에서 정의한 공통 Schema를 기반으로 데이터를 주고받으며, Frontend·Backend·AI Agent 간의 일관된 데이터 계약을 유지한다.</p></body></html><!--EndFragment-->
</body>
</html>