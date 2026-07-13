const fs = require('fs');

const systemPrompt = `
You are the Feature-Slice Planning Agent.
Your task is to break down the given full-stack web development requirements into vertical slices (Supabase, Express, React) and prioritize them.
`;

function generatePlanToHTML(requirement) {
    // 일반적인 웹 서비스의 수직 슬라이스 및 CRUD 구현을 위한 작업 단위 분할
    const breakdown = [
        "1. 데이터 레이어 설정 (Supabase): 요구사항에 맞는 단일 테이블 스키마 설계 및 API 연동을 위한 인증 키(URL, Anon Key) 확보",
        "2. 백엔드 서비스 구현 (Express): Supabase 클라이언트를 초기화하고, 프론트엔드의 요청을 처리할 RESTful API 라우트(데이터 저장 POST, 데이터 조회 GET) 개설",
        "3. 프론트엔드 화면 구현 (React): 사용자 입력을 처리할 input 컴포넌트 구성, state를 활용한 데이터 상태 관리 및 비동기 fetch 함수를 통한 백엔드 API 연동",
        "4. 수직 슬라이스 통합 검증: 화면에서 입력한 데이터가 서버를 거쳐 DB에 정상 저장되고, 저장된 데이터를 실시간으로 다시 불러와 화면을 동적으로 바꾸는지 전체 흐름 검증"
    ];
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>웹 서비스 개발 - 에이전트 계획 수립 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #fafafa; color: #0f172a; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; color: #1e293b; }
        .meta { background: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-size: 14px; border-left: 4px solid #475569; }
        .task-list { list-style: none; padding: 0; }
        .task-item { background: #ffffff; margin-bottom: 12px; padding: 16px; border-left: 4px solid #1e293b; border-radius: 0 6px 6px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-weight: 500; font-size: 15px; }
        .priority { display: inline-block; background: #1e293b; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>웹 서비스 개발 - 에이전트 계획 수립 리포트</h1>
        <div class="meta">
            <strong>대상 개발 요구사항:</strong> ${requirement}
        </div>
        <ul class="task-list">
            ${breakdown.map((task, index) => `
                <li class="task-item">
                    <span class="priority">우선순위 ${index + 1}</span>
                    ${task}
                </li>
            `).join('')}
        </ul>
    </div>
</body>
</html>
    `;
    
    try {
        fs.writeFileSync('planning_result.html', htmlContent, 'utf8');
        console.log("정상 처리: 웹 서비스 개발용 planning_result.html 파일이 생성되었습니다.");
    } catch (error) {
        console.error("오류 발생: 파일 생성 실패", error);
    }
}

// 미션에 부합하는 일반적인 풀스택 기능을 입력값으로 설정
const userRequirement = "React-Express-Supabase 연동을 통한 수직 슬라이스 CRUD 핵심 기능 구현";
generatePlanToHTML(userRequirement);