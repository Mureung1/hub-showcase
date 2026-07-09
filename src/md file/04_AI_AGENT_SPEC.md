<html>
<body>
<!--StartFragment--><html><head></head><body><h1>📄 04_AI_AGENT_SPEC.md</h1><h1>AI Portfolio Agent</h1><hr><h1>1. 문서 목적</h1><p>본 문서는 AI Portfolio Agent 시스템에서 사용되는 AI Agent의 역할, 책임, 데이터 흐름, 입출력 구조를 정의한다.</p><p>본 시스템은 단일 LLM 호출 방식이 아닌 역할별 Agent 구조를 사용한다.</p><p>각 Agent는 명확한 목적을 가지고 동작하며, 이전 Agent의 결과를 입력으로 받아 다음 단계의 판단을 수행한다.</p><hr><h1>2. AI Agent 설계 원칙</h1><h2>2.1 Evidence First</h2><p>모든 AI 결과는 실제 데이터 근거를 기반으로 생성한다.</p><p>AI는 존재하지 않는 경험, 기술, 성과를 만들어서는 안 된다.</p><hr><p>예:</p><p>잘못된 결과</p><pre><code>대규모 트래픽 환경에서
Kafka 기반 이벤트 처리를 구현했습니다.
</code></pre><p>근거 없음</p><p>↓</p><p>생성 금지</p><hr><p>올바른 결과</p><pre><code>주문 처리 과정에서 Kafka 기반
비동기 이벤트 처리를 적용했습니다.
</code></pre><p>근거:</p><pre><code>docker-compose.yml

Kafka 설정

Producer 코드

README
</code></pre><hr><h1>2.2 Structured Output</h1><p>Agent 간 데이터 전달은 자연어가 아닌 구조화된 데이터(JSON)를 기본으로 한다.</p><p>예:</p><pre><code class="language-json">{
 "project_name": "",
 "technology": [],
 "features": [],
 "evidence": []
}
</code></pre><hr><h1>2.3 Single Responsibility</h1><p>각 Agent는 하나의 책임만 가진다.</p><p>예:</p><p>JD Analyzer</p><p>O</p><p>"채용공고 분석"</p><p>X</p><p>"포트폴리오 작성까지 수행"</p><hr><h1>2.4 Human Control</h1><p>AI 결과는 최종 제출 전 사용자가 검토하고 수정할 수 있어야 한다.</p><hr><h1>3. 전체 Agent Architecture</h1><pre><code>                    User

                     |

                     ▼

              Input Manager

                     |

        ┌────────────┼────────────┐

        ▼            ▼            ▼

 GitHub Analyzer  Resume      JD Analyzer

        |          Analyzer        |

        └────────────┼────────────┘

                     |

                     ▼

            Project Metadata

                     |

                     ▼

          Project Retriever Agent

                     |

                     ▼

            Matching Agent

                     |

                     ▼

          Story Generation Agent

                     |

                     ▼

            Reviewer Agent

                     |

                     ▼

        Portfolio Generator Agent
</code></pre><hr><h1>4. Agent 목록</h1><p>본 시스템은 총 8개의 핵심 Agent로 구성한다.</p>
Agent | 역할
-- | --
GitHub Analyzer | 프로젝트 분석
Resume Analyzer | 이력서 분석
JD Analyzer | 채용공고 분석
Project Retriever | 후보 프로젝트 검색
Matching Agent | 프로젝트 선정
Story Generator | 포트폴리오 내용 생성
Reviewer Agent | 검증
Portfolio Generator | 최종 출력 생성

<hr><h1>5. GitHub Analyzer Agent</h1><h2>목적</h2><p>GitHub Repository를 분석하여 프로젝트 정보를 구조화한다.</p><hr><h2>Input</h2><pre><code class="language-json">{
 "repository_url": ""
}
</code></pre><hr><h2>분석 대상</h2><h3>Documentation</h3><ul><li><p>README.md</p></li><li><p>docs/</p></li><li><p>GitHub Wiki</p></li></ul><hr><h3>Configuration</h3><ul><li><p>package.json</p></li><li><p>requirements.txt</p></li><li><p>pom.xml</p></li><li><p>build.gradle</p></li><li><p>Dockerfile</p></li><li><p>docker-compose.yml</p></li></ul><hr><h3>Structure</h3><ul><li><p>Directory Tree</p></li><li><p>주요 폴더 구조</p></li></ul><hr><h3>Optional</h3><p>대표 코드 샘플</p><hr><h2>Output</h2><pre><code class="language-json">{
 "project_name": "",
 "purpose": "",
 "features": [],
 "tech_stack": [],
 "architecture": "",
 "evidence": []
}
</code></pre><hr><h2>주의사항</h2><p>추측한 정보는 반드시 confidence를 표시한다.</p><p>예:</p><pre><code class="language-json">{
 "architecture": "Layered Architecture",
 "confidence": 0.72
}
</code></pre><hr><h1>6. Resume Analyzer Agent</h1><h2>목적</h2><p>사용자의 이력서에서 경험 정보를 추출한다.</p><hr><h2>Input</h2><p>Resume File</p><hr><h2>Output</h2><pre><code class="language-json">{
 "projects": [
  {
   "name":"",
   "role":"",
   "technology":[],
   "achievement":[]
  }
 ]
}
</code></pre><hr><h2>분석 항목</h2><ul><li><p>프로젝트명</p></li><li><p>역할</p></li><li><p>사용 기술</p></li><li><p>기간</p></li><li><p>성과</p></li><li><p>문제 해결 경험</p></li></ul><hr><h1>7. JD Analyzer Agent</h1><h2>목적</h2><p>채용공고에서 기업 요구사항을 분석한다.</p><hr><h2>Input</h2><p>JD Text</p><hr><h2>Output</h2><pre><code class="language-json">{
 "position":"",
 "required_skills":[],
 "preferred_skills":[],
 "keywords":[],
 "responsibility":[]
}
</code></pre><hr><h2>분석 항목</h2><h3>Required Skill</h3><p>필수 기술</p><hr><h3>Preferred Skill</h3><p>우대 기술</p><hr><h3>Business Requirement</h3><p>업무 내용</p><hr><h1>8. Project Retriever Agent</h1><h2>목적</h2><p>Project Library에서 JD와 관련성이 높은 프로젝트를 찾는다.</p><hr><h2>Input</h2><pre><code>JD Metadata

+

Project Library
</code></pre><hr><h2>Output</h2><pre><code class="language-json">{
 "candidates":[
  {
   "project":"",
   "score":0.0,
   "reason":""
  }
 ]
}
</code></pre><hr><h2>판단 기준</h2><ul><li><p>기술 스택</p></li><li><p>프로젝트 목적</p></li><li><p>직무 관련성</p></li><li><p>경험 수준</p></li><li><p>성과 존재 여부</p></li></ul><hr><h1>9. Matching Agent</h1><h2>목적</h2><p>최종 포트폴리오 대상 프로젝트를 선정한다.</p><hr><h2>Input</h2><pre><code>JD Analysis

+

Candidate Projects

+

Resume
</code></pre><hr><h2>Output</h2><pre><code class="language-json">{
 "selected_projects":[],
 "highlight_points":[],
 "reason":""
}
</code></pre><hr><h1>10. Story Generator Agent</h1><h2>목적</h2><p>선정된 프로젝트를 기업 맞춤형 스토리로 변환한다.</p><hr><h2>생성 원칙</h2><h2>결과 중심</h2><p>나쁜 예:</p><pre><code>Redis를 사용했습니다.
</code></pre><p>좋은 예:</p><pre><code>상품 조회 API 응답 개선을 위해
Redis 캐싱 구조를 적용했습니다.
</code></pre><hr><h2>Trade-off 포함</h2><p>단순 기술 나열 금지</p><p>예:</p><pre><code>Redis 적용

↓

왜 선택했는가?

↓

어떤 문제가 있었는가?

↓

어떻게 해결했는가?
</code></pre><hr><h2>AI 문체 제거</h2><p>금지 표현:</p><ul><li><p>열정적인</p></li><li><p>도전적인</p></li><li><p>-가 아니라 - 이다 형태의 문체</p></li></ul><hr><h2>Output</h2><pre><code class="language-json">{
 "slides":[
  {
   "title":"",
   "content":"",
   "evidence":[]
  }
 ]
}
</code></pre><hr><h1>11. Reviewer Agent</h1><h2>목적</h2><p>최종 결과의 품질과 신뢰성을 검증한다.</p><hr><h2>검사 항목</h2><h3>Hallucination Check</h3><p>존재하지 않는 경험 여부</p><hr><h3>Evidence Check</h3><p>근거 존재 여부</p><hr><h3>JD Alignment</h3><p>채용공고와 관련성</p><hr><h3>Writing Quality</h3><p>AI 문체 여부</p><hr><h2>Output</h2><pre><code class="language-json">{
 "status":"PASS",
 "issues":[]
}
</code></pre><hr><h1>12. Portfolio Generator Agent</h1><h2>목적</h2><p>최종 제출물을 생성한다.</p><hr><h2>Input</h2><pre><code>Reviewed Portfolio Content
</code></pre><hr><h2>Output</h2><pre><code>Markdown

PDF

PPT
</code></pre><hr><h1>13. Agent State 관리</h1><p>Agent 간 공유 데이터는 하나의 상태 객체로 관리한다.</p><p>예:</p><pre><code class="language-json">{
 "user_id":"",
 "project_library":[],
 "resume":"",
 "jd":"",
 "selected_projects":[],
 "portfolio":"",
 "review_result":""
}
</code></pre><hr><h1>14. Error Handling</h1><h2>Agent 실패</h2><p>기본 동작:</p><pre><code>Retry

↓

Fallback

↓

User Notification
</code></pre><hr><h2>분석 실패</h2><p>예:</p><p>README 없음</p><p>↓</p><p>다른 Evidence 활용</p><hr><h2>생성 실패</h2><p>↓</p><p>이전 단계 결과 유지</p><p>↓</p><p>재생성 요청</p><hr><h1>15. MVP Agent 범위</h1><p>초기 구현에서는 아래 Agent부터 구현한다.</p><h2>Phase 1</h2><p>필수 Agent</p><pre><code>GitHub Analyzer

Resume Analyzer

JD Analyzer

Matching Agent

Portfolio Generator
</code></pre><hr><h2>Phase 2</h2><p>고도화 Agent</p><pre><code>Reviewer Agent

Story Generator 개선

Project Retriever
</code></pre><hr><h1>16. 향후 확장 Agent</h1><p>추후 추가 가능</p><pre><code>Interview Agent

Resume Writer Agent

Career Advisor Agent

Skill Gap Analyzer Agent

Project Improvement Agent
</code></pre><hr><h1>17. 최종 AI Pipeline</h1><pre><code>GitHub

↓

GitHub Analyzer

↓

Project Library

↓

Resume Analyzer

↓

JD Analyzer

↓

Retriever

↓

Matching

↓

Story Generation

↓

Reviewer

↓

Portfolio Generator

↓

Output
</code></pre><hr><h1>18. 핵심 목표</h1><p>AI Portfolio Agent의 AI 시스템은</p><p>사용자의 실제 개발 경험을 이해하고,</p><p>채용 요구사항과 연결하며,</p><p>근거 기반으로 설득력 있는 포트폴리오를 생성하는</p><p>개인 Career Agent를 목표로 한다.</p></body></html><!--EndFragment-->
</body>
</html>