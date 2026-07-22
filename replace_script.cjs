const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'TimetableGenerator.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The new content to insert
const newCatalogAndTemplates = `// Predefined Course Catalog Database (Real-world University 2026-2 Curriculum)
const COURSE_CATALOG = {
  // --- 컴퓨터공학과 전공 ---
  'data-struct': {
    id: 'data-struct',
    title: '자료구조 및 실습',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '김철수 교수',
    room: '공학4호관 301호',
    credits: 3,
    eval: '자료구조 설계 능력을 키우는 과목. 과제 3개가 존재하지만 교수님이 친절하십니다.',
    slots: [
      { day: 1, start: 13, end: 15 },
      { day: 3, start: 13, end: 14 }
    ]
  },
  'db': {
    id: 'db',
    title: '데이터베이스 시스템',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '박영희 교수',
    room: '공학4호관 405호',
    credits: 3,
    eval: 'SQL 실습 및 DB 정규화 개념을 배움. 기말 프로젝트로 웹 서비스 구축이 포함됩니다.',
    slots: [
      { day: 2, start: 14, end: 16 },
      { day: 4, start: 14, end: 15 }
    ]
  },
  'comp-arch': {
    id: 'comp-arch',
    title: '컴퓨터 구조',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '최성훈 교수',
    room: '공학4호관 201호',
    credits: 3,
    eval: '파이프라이닝, 캐시 메모리 구조 및 CPU 명령어 집합 구조(ISA) 심화 학습.',
    slots: [
      { day: 1, start: 9, end: 10 },
      { day: 3, start: 9, end: 11 }
    ]
  },
  'algorithm': {
    id: 'algorithm',
    title: '알고리즘 및 실습',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '홍길동 교수',
    room: '공학4호관 402호',
    credits: 3,
    eval: '시간 복잡도, 탐욕법, 동적 계획법 기초 습득. 코딩 연습 플랫폼 매주 실습.',
    slots: [
      { day: 2, start: 9, end: 10 },
      { day: 4, start: 9, end: 11 }
    ]
  },
  'os': {
    id: 'os',
    title: '운영체제 시스템',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '백지훈 교수',
    room: '공학4호관 203호',
    credits: 3,
    eval: '프로세스 관리, 세마포어, 메모리 가상화 학습. 난이도는 높지만 면접 필수 강의.',
    slots: [
      { day: 3, start: 14, end: 16 },
      { day: 5, start: 14, end: 15 }
    ]
  },
  'compiler': {
    id: 'compiler',
    title: '컴파일러 개론',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '조민석 교수',
    room: '공학4호관 302호',
    credits: 3,
    eval: '어휘 분석, 파싱, 구문 해석기(Parser) 제작 및 중간 코드 생성 실무.',
    slots: [
      { day: 1, start: 16, end: 18 },
      { day: 3, start: 16, end: 17 }
    ]
  },
  'network': {
    id: 'network',
    title: '컴퓨터네트워크',
    category: 'major-opt',
    categoryName: '컴공전공선택',
    prof: '이민수 교수',
    room: '공학4호관 102호',
    credits: 3,
    eval: 'TCP/IP 프로토콜 분석 실습 위주. 이론은 다소 어려우나 시험 족보 제공.',
    slots: [
      { day: 1, start: 10, end: 12 },
      { day: 3, start: 11, end: 12 }
    ]
  },
  'software-eng': {
    id: 'software-eng',
    title: '소프트웨어공학',
    category: 'major-opt',
    categoryName: '컴공전공선택',
    prof: '정혜원 교수',
    room: '공학4호관 303호',
    credits: 3,
    eval: '애자일 방법론과 디자인 패턴 적용 실무. 조별 과제 발표 비중이 높음.',
    slots: [
      { day: 2, start: 10, end: 12 },
      { day: 4, start: 11, end: 12 }
    ]
  },
  'ai-intro': {
    id: 'ai-intro',
    title: '인공지능 개론 및 실습',
    category: 'major-opt',
    categoryName: '컴공전공선택',
    prof: '강현우 교수',
    room: '공학4호관 501호',
    credits: 3,
    eval: '머신러닝 기초 알고리즘부터 PyTorch 딥러닝 실습까지 다루는 인기 전공 과목.',
    slots: [
      { day: 1, start: 15, end: 17 },
      { day: 3, start: 15, end: 16 }
    ]
  },
  'machine-learning': {
    id: 'machine-learning',
    title: '머신러닝 실무',
    category: 'major-opt',
    categoryName: '컴공전공선택',
    prof: '한상우 교수',
    room: '공학4호관 502호',
    credits: 3,
    eval: '회귀 분석, 분류 모델, Scikit-learn 모델 튜닝 및 데이터 바인딩 실습.',
    slots: [
      { day: 2, start: 15, end: 17 },
      { day: 4, start: 15, end: 16 }
    ]
  },
  'cloud-comp': {
    id: 'cloud-comp',
    title: '클라우드 컴퓨팅',
    category: 'major-opt',
    categoryName: '컴공전공선택',
    prof: '오승민 교수',
    room: '공학4호관 205호',
    credits: 3,
    eval: 'AWS, Docker, Kubernetes 데브옵스 인프라 구축 및 가상화 실무.',
    slots: [
      { day: 5, start: 15, end: 18 }
    ]
  },
  'security': {
    id: 'security',
    title: '정보보안 개론',
    category: 'major-req',
    categoryName: '컴공전공필수',
    prof: '김철수 교수',
    room: '공학4호관 402호',
    credits: 3,
    eval: '암호학 기초 및 네트워크 보안 실무. 전년 대비 난이도가 쉬워 평점 양호.',
    slots: [
      { day: 4, start: 15, end: 17 }
    ]
  },

  // --- 경영정보학과 전공 ---
  'intro-mis': {
    id: 'intro-mis',
    title: '경영정보시스템(MIS)',
    category: 'major-req',
    categoryName: '경영정보전필',
    prof: '서지현 교수',
    room: '경영관 101호',
    credits: 3,
    eval: '기업 경영에서 정보기술(IT) 인프라의 가치와 비즈니스 모델 활용 방안 개론.',
    slots: [
      { day: 1, start: 10, end: 12 },
      { day: 3, start: 11, end: 12 }
    ]
  },
  'bus-processing': {
    id: 'bus-processing',
    title: '비즈니스프로세스관리(BPM)',
    category: 'major-opt',
    categoryName: '경영정보전선',
    prof: '박성진 교수',
    room: '경영관 202호',
    credits: 3,
    eval: '기업 업무 프로세스의 가시화, 분석, 모델링 기법 실습 위주 강의.',
    slots: [
      { day: 4, start: 16, end: 18 }
    ]
  },
  'marketing': {
    id: 'marketing',
    title: '마케팅 원론',
    category: 'major-req',
    categoryName: '경영정보전필',
    prof: '이지은 교수',
    room: '경영관 301호',
    credits: 3,
    eval: 'STP 및 마케팅 믹스 4P 전략. 마케팅 기획서 작성 실습 발표.',
    slots: [
      { day: 3, start: 15, end: 17 }
    ]
  },
  'accounting': {
    id: 'accounting',
    title: '회계원리',
    category: 'major-req',
    categoryName: '경영정보전필',
    prof: '김지훈 교수',
    room: '경영관 104호',
    credits: 3,
    eval: '복식 부기, 대차대조표 및 손익계산서 작성법 기초 회계 지식 습득.',
    slots: [
      { day: 2, start: 10, end: 12 }
    ]
  },
  'sys-analysis': {
    id: 'sys-analysis',
    title: '시스템 분석 및 설계',
    category: 'major-opt',
    categoryName: '경영정보전선',
    prof: '윤상현 교수',
    room: '경영관 205호',
    credits: 3,
    eval: 'UML 설계를 기반으로 비즈니스 정보시스템 설계 명세서 제작 프로젝트.',
    slots: [
      { day: 5, start: 13, end: 15 }
    ]
  },

  // --- 통계학과 전공 ---
  'intro-stats': {
    id: 'intro-stats',
    title: '통계학개론',
    category: 'major-req',
    categoryName: '통계전공필수',
    prof: '송명호 교수',
    room: '자연과학관 104호',
    credits: 3,
    eval: '가설 검정, 확률 분포, 기술 통계학 등 기초 통계 분석 입문.',
    slots: [
      { day: 2, start: 13, end: 15 }
    ]
  },
  'probability': {
    id: 'probability',
    title: '확률론',
    category: 'major-req',
    categoryName: '통계전공필수',
    prof: '권태우 교수',
    room: '자연과학관 201호',
    credits: 3,
    eval: '조건부 확률, 베이즈 정리, 확률 변수 및 분포 함수 이론적 탐색.',
    slots: [
      { day: 1, start: 13, end: 15 }
    ]
  },
  'regression': {
    id: 'regression',
    title: '회귀분석 및 실습',
    category: 'major-opt',
    categoryName: '통계전공선택',
    prof: '김경상 교수',
    room: '자연과학관 301호',
    credits: 3,
    eval: 'R 언어를 활용한 선형 회귀 모형 추정, 잔차 분석 및 다중공선성 검정.',
    slots: [
      { day: 3, start: 13, end: 15 }
    ]
  },
  'math-stats': {
    id: 'math-stats',
    title: '수리통계학',
    category: 'major-req',
    categoryName: '통계전공필수',
    prof: '최은정 교수',
    room: '자연과학관 203호',
    credits: 3,
    eval: '추정과 검정의 수리적 유도, 최대우도추정량(MLE) 및 통계량 성질 연구.',
    slots: [
      { day: 4, start: 13, end: 15 }
    ]
  },
  'time-series': {
    id: 'time-series',
    title: '시계열분석',
    category: 'major-opt',
    categoryName: '통계전공선택',
    prof: '이민수 교수',
    room: '자연과학관 304호',
    credits: 3,
    eval: 'ARIMA 모형, 지수평활법 등 시계열 데이터 분석 및 예측 실습.',
    slots: [
      { day: 5, start: 9, end: 12 }
    ]
  },

  // --- 융합교양 영역별 교과목 ---
  'oriental-phil-converge': {
    id: 'oriental-phil-converge',
    title: '동양 사상과 현대사회',
    category: 'converge-edu',
    categoryName: '융합교양 (1영역)',
    prof: '하늘 교수',
    room: '교양학관 101호',
    credits: 3,
    eval: '역사와 사상 융합교양 1영역 이수 인정. 인문학 성찰 글쓰기 대체.',
    slots: [
      { day: 3, start: 10, end: 12 }
    ]
  },
  'universe-life': {
    id: 'universe-life',
    title: '우주와 지구환경',
    category: 'converge-edu',
    categoryName: '융합교양 (2영역)',
    prof: '윤아름 교수',
    room: '자연과학관 102호',
    credits: 3,
    eval: '우주와 생명 융합교양 2영역 이수 인정. 지구 온난화 및 우주 환경 학습.',
    slots: [
      { day: 4, start: 15, end: 17 }
    ]
  },
  'tech-society': {
    id: 'tech-society',
    title: '기술과 현대사회',
    category: 'converge-edu',
    categoryName: '융합교양 (3영역)',
    prof: '최은정 교수',
    room: '교양학관 201호',
    credits: 3,
    eval: '기술과 사회 융합교양 3영역 이수 인정. 에세이 제출 대체.',
    slots: [
      { day: 5, start: 10, end: 12 }
    ]
  },
  'culture-art-converge': {
    id: 'culture-art-converge',
    title: '현대 사회와 미디어 아트',
    category: 'converge-edu',
    categoryName: '융합교양 (4영역)',
    prof: '장기하 교수',
    room: '예술관 102호',
    credits: 3,
    eval: '문화와 예술 융합교양 4영역 이수 인정. 미디어 아트 실습 감상.',
    slots: [
      { day: 1, start: 15, end: 17 }
    ]
  },

  // --- 균형교양 및 기초교양 ---
  'art-life': {
    id: 'art-life',
    title: '예술과 현대생활',
    category: 'balance-edu',
    categoryName: '균형교양 (4영역)',
    prof: '홍길동 교수',
    room: '미술관 310호',
    credits: 3,
    eval: '미술사 및 생활 디자인 접목 교양. 미술관 관람기 제출.',
    slots: [
      { day: 1, start: 15, end: 17 }
    ]
  },
  'college-eng': {
    id: 'college-eng',
    title: '대학영어',
    category: 'general',
    categoryName: '기초교양',
    prof: 'Smith 교수',
    room: '교양학관 301호',
    credits: 3,
    eval: '글로벌 회화 및 원어민 프리젠테이션 실무 실습.',
    slots: [
      { day: 2, start: 13, end: 15 }
    ]
  },
  'dream-future': {
    id: 'dream-future',
    title: '꿈·미래개척',
    category: 'general',
    categoryName: '기초교양 (0.5학점)',
    prof: '학과지도 교수',
    room: '온라인 강의실',
    credits: 0.5,
    eval: '학과 지도교수 1:1 진로 상담 이수 과목.',
    slots: [
      { day: 5, start: 17, end: 18 }
    ]
  }
};

// Student Profile Settings Templates
const STUDENT_PROFILE_TEMPLATES = {
  'transfer': {
    name: '김경상',
    badge: '편입생',
    major: '컴퓨터공학과 | 3학년',
    credits: {
      total: 84,
      totalGoal: 130,
      majorReq: 12,
      majorReqGoal: 24,
      majorOpt: 30,
      majorOptGoal: 36,
      coreEdu: 9,
      coreEduGoal: 9,
      balanceEdu: 12,
      balanceEduGoal: 12,
      convergeEdu: 3,
      convergeEduGoal: 6
    },
    initialCourses: ['data-struct', 'db', 'network', 'software-eng'],
    warningText: '융합교양 1영역 3학점 미이수',
    diagnosticBrief: '김경상님, 졸업 요건을 충족하기 위해 이번 학기에 컴퓨터공학과 전공필수(자료구조, 데이터베이스 등) 및 융합교양 1영역 이수가 필요합니다.',
    diagnosticBullets: [
      { type: 'red', text: '융합교양 1영역 누락 (3학점)' },
      { type: 'yellow', text: '전공 필수 이수 요건 미달 (잔여 12학점 필요)' }
    ],
    welcomeMsg: '안녕하세요 김경상님! 컴퓨터공학과 편입생 AI 네비게이터입니다. 현재 졸업을 위해 잔여 전공필수 12학점과 융합교양 1영역 미이수 요건이 확인됩니다. 무엇을 도와드릴까요?',
    chips: [
      { label: '융합교양 1영역 추천 과목 보기', id: 'converge-list' },
      { label: '전공필수 미이수 과목 자동배정', id: 'auto-schedule' },
      { label: '컴공 전필 과목 추천해줘', id: 'major-req-list' }
    ]
  },
  'general': {
    name: '박경상',
    badge: '재학생',
    major: '경영정보학과 | 3학년',
    credits: {
      total: 96,
      totalGoal: 130,
      majorReq: 18,
      majorReqGoal: 24,
      majorOpt: 24,
      majorOptGoal: 36,
      coreEdu: 9,
      coreEduGoal: 9,
      balanceEdu: 9,
      balanceEduGoal: 12,
      convergeEdu: 6,
      convergeEduGoal: 6
    },
    initialCourses: ['intro-mis', 'bus-processing', 'marketing'],
    warningText: '융합교양 2영역 3학점 미이수',
    diagnosticBrief: '박경상님, 경영정보학과 졸업 요건 충족을 위해 전공필수 경영정보시스템(MIS) 및 융합교양 2영역 이수가 반드시 필요합니다.',
    diagnosticBullets: [
      { type: 'red', text: '융합교양 2영역 누락 (3학점)' },
      { type: 'yellow', text: '경영정보전공 필수 누락 (잔여 6학점 필요)' }
    ],
    welcomeMsg: '안녕하세요 박경상님! 경영정보학과 재학생 AI 네비게이터입니다. 현재 3학년 2학기 진입 기준, 경영정보시스템(MIS)과 융합교양 2영역 이수가 필요합니다. 원하시는 추천 방향을 말씀해주세요.',
    chips: [
      { label: '융합교양 2영역 추천 과목 보기', id: 'balance-list' },
      { label: '경영정보전필 포함 18학점 시간표 짜줘', id: 'general-schedule' },
      { label: '경영정보학과 전필 미이수 과목 확인', id: 'general-major-req' }
    ]
  },
  'double-major': {
    name: '이경상',
    badge: '다전공자',
    major: '통계학과+컴퓨터공학 | 3학년',
    credits: {
      total: 78,
      totalGoal: 150,
      majorReq: 15,
      majorReqGoal: 30,
      majorOpt: 18,
      majorOptGoal: 30,
      coreEdu: 9,
      coreEduGoal: 9,
      balanceEdu: 12,
      balanceEduGoal: 12,
      convergeEdu: 3,
      convergeEduGoal: 6
    },
    initialCourses: ['intro-stats', 'probability', 'data-struct'],
    warningText: '통계전필 및 융합교양 4영역 미이수',
    diagnosticBrief: '이경상님, 통계학과 주전공 및 컴퓨터공학 다전공 졸업 요건을 충족하기 위해 통계전필 수리통계학(3학점)과 융합교양 4영역 이수가 필요합니다.',
    diagnosticBullets: [
      { type: 'red', text: '수리통계학 누락 (3학점)' },
      { type: 'yellow', text: '융합교양 4영역 누락 (3학점)' }
    ],
    welcomeMsg: '안녕하세요 이경상님! 통계학과 및 컴퓨터공학 다전공 AI 네비게이터입니다. 주전공(통계)과 다전공(컴공) 졸업 요건을 모두 충족시킬 수 있는 시뮬레이션을 도와드리겠습니다.',
    chips: [
      { label: '통계학과 전공필수 리스트 보여줘', id: 'double-major-list' },
      { label: '융합교양 4영역 + 통계전필 포함 18학점 설계해줘', id: 'double-schedule' }
    ]
  }
};`;

// Regex replacement
const regex = /\/\/ Predefined Course Catalog Database[\s\S]*?const STUDENT_PROFILE_TEMPLATES = {[\s\S]*?\n};/;
if (regex.test(content)) {
  content = content.replace(regex, newCatalogAndTemplates);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS");
} else {
  // Try another regex if first fails
  const altRegex = /const COURSE_CATALOG = {[\s\S]*?const STUDENT_PROFILE_TEMPLATES = {[\s\S]*?\n};/;
  if (altRegex.test(content)) {
    content = content.replace(altRegex, newCatalogAndTemplates);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("SUCCESS");
  } else {
    console.log("FAIL");
  }
}
