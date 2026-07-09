<html>
<body>
<!--StartFragment--><html><head></head><body><h1>📄 08_DATABASE.md</h1><h1>AI Portfolio Agent</h1><hr><h1>1. 문서 목적</h1><p>본 문서는 AI Portfolio Agent의 데이터베이스 구조를 정의한다.</p><p>데이터베이스는 사용자 정보 저장소 이상의 사용자의 프로젝트를 AI가 이해하고 재사용할 수 있는 <strong>Knowledge Base</strong> 역할을 수행한다.</p><p>모든 AI Agent는 데이터베이스에 저장된 구조화된 데이터를 기반으로 동작한다.</p><hr><h1>2. 설계 원칙</h1><h2>2.1 Project Library 중심 설계</h2><p>시스템의 핵심은 Project Library이다.</p><p>GitHub Repository는 최초 1회 분석하며, 분석 결과(Project Metadata)를 저장하고 이후에는 이를 재사용한다.</p><pre><code class="language-text">GitHub

↓

Repository

↓

Project Metadata

↓

Project Library

↓

Portfolio Generation
</code></pre><hr><h2>2.2 Evidence 기반 저장</h2><p>AI가 생성한 모든 정보는 반드시 근거(Evidence)와 연결되어야 한다.</p><p>예)</p><pre><code>Redis Cache 적용

↓

README.md

↓

RedisConfig.java

↓

docs/performance.md
</code></pre><hr><h2>2.3 분석 데이터 재사용</h2><p>동일 Repository를 매번 다시 분석하지 않는다.</p><p>프로젝트 변경 시에만 재분석을 수행한다.</p><hr><h1>3. ERD (Entity Relationship Diagram)</h1><pre><code class="language-text">User
 │
 ├──────────────┐
 │              │
 ▼              ▼
Resume      Repository
                 │
                 ▼
         Project Metadata
                 │
         ┌───────┴────────┐
         ▼                ▼
     Evidence        Project Tag
                 │
                 ▼
            Portfolio
                 │
                 ▼
         Portfolio Version
                 │
                 ▼
          Download History
</code></pre><hr><h1>4. Entity 목록</h1><p>시스템은 다음 Entity로 구성한다.</p>
Entity | 설명
-- | --
User | 사용자
Resume | 이력서
Repository | GitHub 저장소
ProjectMetadata | 프로젝트 분석 결과
Evidence | 분석 근거
ProjectTag | 프로젝트 태그
JobDescription | 채용공고
Portfolio | 생성된 포트폴리오
PortfolioVersion | 포트폴리오 버전
DownloadHistory | 다운로드 기록

<hr><h1>5. User</h1><p>사용자 기본 정보</p><h3>Fields</h3><pre><code>id

email

password

github_username

profile_image

created_at

updated_at
</code></pre><hr><h1>6. Resume</h1><p>사용자가 업로드한 이력서</p><h3>Fields</h3><pre><code>id

user_id

file_name

file_path

parsed_text

created_at
</code></pre><hr><h1>7. Repository</h1><p>GitHub Repository 정보</p><h3>Fields</h3><pre><code>id

user_id

repository_name

repository_url

default_branch

visibility

last_commit_sha

last_analyzed_at

created_at
</code></pre><h3>관계</h3><p>User</p><p>↓</p><p>Repository (1:N)</p><hr><h1>8. Project Metadata</h1><p>GitHub Analyzer가 생성하는 핵심 데이터</p><h3>Fields</h3><pre><code>id

repository_id

project_name

description

purpose

architecture

analysis_confidence

created_at

updated_at
</code></pre><hr><h3>JSON Columns</h3><pre><code>tech_stack

features

deployment

architecture_detail

summary

</code></pre><hr><h3>관계</h3><p>Repository</p><p>↓</p><p>ProjectMetadata (1:1)</p><hr><h1>9. Evidence</h1><p>AI 생성의 근거</p><h3>Fields</h3><pre><code>id

metadata_id

file_path

file_type

claim

start_line

end_line

confidence
</code></pre><p>예)</p><pre><code>claim

↓

Redis Cache 적용

↓

README.md

↓

line 40~58
</code></pre><hr><h1>10. Project Tag</h1><p>프로젝트 검색을 위한 태그</p><p>예)</p><pre><code>Backend

Spring

Redis

Docker

FastAPI

AI

LLM

Agent
</code></pre><h3>Fields</h3><pre><code>id

metadata_id

tag_name

score
</code></pre><hr><h1>11. Job Description</h1><p>사용자가 입력한 채용공고</p><h3>Fields</h3><pre><code>id

user_id

company

position

jd_text

required_skills

preferred_skills

keywords

created_at
</code></pre><hr><h1>12. Portfolio</h1><p>생성된 포트폴리오</p><h3>Fields</h3><pre><code>id

user_id

metadata_id

jd_id

title

markdown_content

status

created_at
</code></pre><p>status</p><pre><code>Draft

Published

Archived
</code></pre><hr><h1>13. Portfolio Version</h1><p>포트폴리오 버전 관리</p><h3>Fields</h3><pre><code>id

portfolio_id

version

markdown

created_at
</code></pre><hr><h1>14. Download History</h1><p>다운로드 기록</p><h3>Fields</h3><pre><code>id

portfolio_id

download_type

download_time
</code></pre><p>download_type</p><pre><code>PDF

PPT

Markdown
</code></pre><hr><h1>15. 관계(Relationship)</h1><pre><code>User

│

├── Resume

├── Repository

├── JobDescription

└── Portfolio



Repository

│

└── ProjectMetadata



ProjectMetadata

│

├── Evidence

├── ProjectTag

└── Portfolio



Portfolio

│

├── PortfolioVersion

└── DownloadHistory
</code></pre><hr><h1>16. AI Agent 데이터 흐름</h1><pre><code>GitHub Repository

↓

Repository

↓

Project Metadata

↓

Evidence

↓

Project Library

↓

Matching Agent

↓

Portfolio Generator

↓

Portfolio
</code></pre><hr><h1>17. 인덱스 전략</h1><p>조회 성능 향상을 위해 다음 필드에 인덱스를 생성한다.</p><pre><code>repository_name

github_username

company

position

created_at

tag_name

last_analyzed_at
</code></pre><p>향후 벡터 검색을 도입할 경우</p><pre><code>Project Metadata

Job Description
</code></pre><p>에 Embedding 컬럼을 추가할 수 있도록 설계한다.</p><hr><h1>18. 향후 확장</h1><p>향후 다음 테이블을 추가할 수 있다.</p><pre><code>InterviewQuestion

CareerReport

SkillGapAnalysis

ProjectFeedback

LLMLog

PromptHistory

AgentExecution

VectorEmbedding
</code></pre><p>현재 구조는 이러한 기능을 추가해도 기존 스키마를 크게 변경하지 않고 확장할 수 있도록 설계한다.</p><hr><h1>19. 핵심 설계 요약</h1><p>AI Portfolio Agent의 데이터베이스는 일반적인 CRUD 시스템이 아니라, 사용자의 프로젝트를 AI가 이해하고 재사용하기 위한 Knowledge Base를 구축하는 것을 목표로 한다.</p><p>핵심 데이터 흐름은 다음과 같다.</p><pre><code class="language-text">GitHub Repository

↓

Project Metadata

↓

Evidence

↓

Project Library

↓

Job Description

↓

Matching Agent

↓

Portfolio Generator

↓

Portfolio Output
</code></pre><p>Project Metadata와 Evidence는 모든 AI Agent가 공통으로 참조하는 핵심 데이터이며, 시스템 전체의 기반이 된다.</p></body></html><!--EndFragment-->
</body>
</html>