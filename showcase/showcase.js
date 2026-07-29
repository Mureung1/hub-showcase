{
  "schemaVersion": 1,
  "title": "MentorING",
  "summary": "멘토(대학원생)와 멘티(학부생)를 연결해주는 플랫폼입니다.",
  "githubUser": "meatbest9(백승주)",
  "demoUrl": "https://mentoring-sigma.vercel.app/",
  "demoVideoUrl": "https://www.youtube.com/watch?v=example-video-id",
  "thumbnail": "thumbnail.webp",
  "screenshots": [
    "screenshots/home.webp",
    "screenshots/menteehome.webp",
    "screenshots/mentorhome.webp",
    "screenshots/question.webp"
  ],
  "problem": "학부생이 고민이 있을 때, 대학원생에게 조언을 구하기가 너무 어렵다.",
  "targetUsers": [
    "고민이 있는 학부생",
    "학부생들을 돕고 싶은 대학원생"
  ],
  "features": [
    "멘티와 멘토를 매칭해줍니다.",
    "쌓인 포인트를 바탕으로 멘토가 상점을 이용할 수 있습니다(추가 예정)."

  ],
  "featureTags": [
    "멘토링 매칭",
    "포인트 관리"
    
  ],
  "techStack": [
    "React",
    "axios",
    "Express",
    "cors",
    "dotenv",
    "Vite",
    "nodemon"
  ],
  "techHighlights": [
    "React 상태 관리로 멘토들의 프로필 정보를 화면에 나타냅니다.",
    "Express API와 axios를 사용해서 면담 신청 생성, 조회, 수락, 거절 등을 구현합니다.",
    "Agent 1개와 Skill 5개를 Workflow로 연결해 질문 분석부터 결과 요약까지 처리합니다."
  ],
  "developmentWithAI": "저는 문제와 핵심 기능을 정했습니다. AI는 핵심 기능 구현 전략과 이를 바탕으로 작업 계획을 수립하고, 코드를 구현했습니다. 저는 또한 AI의 결과물을 검토했습니다",
  "agent": {
    "summary": "기획부터 구현, 테스트, PR 작성까지 Agent와 Skill을 함께 사용했습니다.",
    "agentTools": [
      {
        "type": "agent",
        "name": "planner Agent",
        "purpose": "작업을 알맞은 단위로 나누고, 세부 작업의 우선순위를 정해줍니다."
      },
      {
        "type": "agent",
        "name": "test Agent",
        "purpose": "클라이언트, 서버, DB 각각에서 주요 흐름이 잘 작동하는지 확인합니다."
      },
      {
        "type": "skill",
        "name": "Design Skill",
        "purpose": "UI를 보다 일관된 스타일로 설계하도록 돕습니다."
      }
    ],
    "workflows": [
      {
        "name": "기능 개발 Workflow",
        "steps": [
          "핵심 기능 정의",
          "Agent에게 구현 계획 요청",
          "계획 검토한 뒤 Agent로 코드 구현",
          " Test Agent로 테스트 실행"
        
        ]
      },
      {
        "name": "PR 협업 Workflow",
        "steps": [
          "PR 작성",
          "Agent에게 변경 내용 점검 요청",
          "리뷰 의견 반영",
          "최종 결과 확인"
        ]
      }
    ]
  }
}