// server/src/chat/toolDeclarations.js
// Gemini(@google/genai)에게 넘길 FunctionDeclaration 목록.
// parameters는 @google/genai의 Schema 포맷(type 값이 대문자: 'OBJECT'/'STRING'/'ARRAY'/'NUMBER')을 따른다.
// 실제 실행 로직은 여기 없다 — toolHandlers.js에서 이 name과 매칭해 실행한다.
const toolDeclarations = [
  {
    name: 'get_graduation_status',
    description:
      '사용자의 현재 총학점/전공/교양 이수 현황과 부족분, 그리고 다중전공·창업교과목·' +
      '종합설계 등 트랙 특수요건 충족 여부를 조회한다. 학점이나 졸업 가능 여부 관련 ' +
      '질문에는 반드시 이 도구를 먼저 호출한다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        track: { type: 'STRING', description: "예: 'multi-major', 'overseas-dual-degree'" },
      },
      required: ['track'],
    },
  },
  {
    name: 'simulate_plan',
    description:
      '사용자가 미래 학기에 추가로 수강할 과목 목록을 입력하면, 누적 학점 기준 ' +
      '졸업 가능 여부와 남은 학기 수를 계산한다. "몇 학점 들으면 졸업해?" 같은 ' +
      '시뮬레이션 질문에 이 도구를 호출한다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        additionalCourses: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              credits: { type: 'NUMBER' },
            },
          },
        },
      },
      required: ['additionalCourses'],
    },
  },
  {
    name: 'recommend_courses',
    description:
      "부족한 영역(전공/교양/창업교과목/종합설계 등)을 채울 수 있는 실제 다음 학기 " +
      "개설과목을 추천한다. '어떤 과목 들어야 해?' 질문에 이 도구를 호출한다.",
    parameters: {
      type: 'OBJECT',
      properties: {
        shortageArea: { type: 'STRING', description: "예: '전공', '창업교과목'" },
      },
      required: ['shortageArea'],
    },
  },
];

module.exports = { toolDeclarations };
