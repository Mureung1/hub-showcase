// ==========================================================================
// GNU Course AI Navigator - Interactive Application Logic
// ==========================================================================

// Predefined Course Catalog Database
const COURSE_CATALOG = {
    // Basic courses pre-loaded on profile types
    'data-struct': {
        id: 'data-struct',
        title: '자료구조 및 실습',
        category: 'major-req',
        categoryName: '전공필수',
        prof: '김철수 교수',
        room: '공학4호관 301호',
        credits: 3,
        eval: '자료구조 설계 능력을 키우는 과목. 과제 3개가 존재하지만 교수님이 친절하십니다.',
        slots: [
            { day: 1, start: 13, end: 15 }, // 월 13:00-15:00
            { day: 3, start: 13, end: 14 }  // 수 13:00-14:00
        ]
    },
    'db': {
        id: 'db',
        title: '데이터베이스 시스템',
        category: 'major-req',
        categoryName: '전공필수',
        prof: '박영희 교수',
        room: '공학4호관 405호',
        credits: 3,
        eval: 'SQL 실습 및 DB 정규화 개념을 배움. 기말 프로젝트로 간단한 웹 서비스 구축이 포함됩니다.',
        slots: [
            { day: 2, start: 14, end: 16 }, // 화 14:00-16:00
            { day: 4, start: 14, end: 15 }  // 목 14:00-15:00
        ]
    },
    'network': {
        id: 'network',
        title: '컴퓨터네트워크',
        category: 'major-opt',
        categoryName: '전공선택',
        prof: '이민수 교수',
        room: '공학4호관 102호',
        credits: 3,
        eval: 'TCP/IP 프로토콜 분석 실습 위주. 이론은 다소 어려우나 시험 족보가 제공되어 대비하기 좋습니다.',
        slots: [
            { day: 1, start: 10, end: 12 }, // 월 10:00-12:00
            { day: 3, start: 10, end: 11 }  // 수 10:00-11:00
        ]
    },
    'software-eng': {
        id: 'software-eng',
        title: '소프트웨어공학',
        category: 'major-opt',
        categoryName: '전공선택',
        prof: '정혜원 교수',
        room: '공학4호관 303호',
        credits: 3,
        eval: '애자일 방법론과 디자인 패턴 적용 실무. 조별 과제 발표 비중이 높은 편입니다.',
        slots: [
            { day: 2, start: 10, end: 12 }, // 화 10:00-12:00
            { day: 4, start: 10, end: 11 }  // 목 10:00-11:00
        ]
    },
    
    // AI Recommendations for Transfer Student (김경상)
    'tech-society': {
        id: 'tech-society',
        title: '기술과 현대사회',
        category: 'converge-edu',
        categoryName: '융합교양 (3영역)',
        prof: '최은정 교수',
        room: '교양학관 201호',
        credits: 3,
        eval: '인문학적 관점에서 정보통신 기술 발전을 논의함. 중간/기말 고사 대신 에세이 제출로 대체.',
        slots: [
            { day: 5, start: 10, end: 12 } // 금 10:00-12:00
        ]
    },
    'tech-society-thu': {
        id: 'tech-society-thu',
        title: '기술과 현대사회 (목반)',
        category: 'converge-edu',
        categoryName: '융합교양 (3영역)',
        prof: '최은정 교수',
        room: '교양학관 201호',
        credits: 3,
        eval: '인문학적 관점에서 정보통신 기술 발전을 논의함. 금공강 확보를 위한 최적의 목요일 교양 반.',
        slots: [
            { day: 4, start: 15, end: 17 } // 목 15:00-17:00
        ]
    },
    'pop-art': {
        id: 'pop-art',
        title: '대중예술의 이해',
        category: 'converge-edu',
        categoryName: '융합교양 (3영역)',
        prof: '장기하 교수',
        room: '예술관 105호',
        credits: 3,
        eval: '대중영화 및 대중음악 트렌드 토론. 영화 감상 시간이 포함되어 재미있게 학점을 채울 수 있음.',
        slots: [
            { day: 5, start: 13, end: 15 } // 금 13:00-15:00
        ]
    },
    'algorithm': {
        id: 'algorithm',
        title: '알고리즘 및 실습',
        category: 'major-req',
        categoryName: '전공필수',
        prof: '홍길동 교수',
        room: '공학4호관 402호',
        credits: 3,
        eval: '시간 복잡도, 탐욕법, 동적 계획법 기초 습득. 코딩 연습 플랫폼을 활용한 매주 실습이 평가됩니다.',
        slots: [
            { day: 2, start: 9, end: 10 }, // 화 09:00-10:00
            { day: 4, start: 9, end: 11 }  // 목 09:00-11:00
        ]
    },
    'os': {
        id: 'os',
        title: '운영체제 시스템',
        category: 'major-req',
        categoryName: '전공필수',
        prof: '백지훈 교수',
        room: '공학4호관 203호',
        credits: 3,
        eval: '프로세스 관리, 세마포어, 메모리 가상화 학습. 난이도는 높지만 면접 대비용으로 필수적인 강의.',
        slots: [
            { day: 3, start: 14, end: 16 }, // 수 14:00-16:00
            { day: 5, start: 14, end: 15 }  // 금 14:00-15:00
        ]
    },

    // AI Recommendations for General Student (박경상)
    'art-life': {
        id: 'art-life',
        title: '예술과 현대생활',
        category: 'balance-edu',
        categoryName: '균형교양 (4영역)',
        prof: '윤아름 교수',
        room: '미술관 310호',
        credits: 3,
        eval: '서양 미술사를 생활 디자인에 접목하여 배움. 기말 레포트와 간단한 미술관 관람기가 과제입니다.',
        slots: [
            { day: 1, start: 15, end: 17 } // 월 15:00-17:00
        ]
    },
    'security': {
        id: 'security',
        title: '정보보안 개론',
        category: 'major-req',
        categoryName: '전공필수',
        prof: '김철수 교수',
        room: '공학4호관 402호',
        credits: 3,
        eval: '암호학 기초 및 네트워크 보안 실무. 전년 대비 난이도가 쉬워져 평점이 높은 편입니다.',
        slots: [
            { day: 4, start: 15, end: 17 } // 목 15:00-17:00
        ]
    },

    // AI Recommendations for Double Major (이경상)
    'marketing': {
        id: 'marketing',
        title: '마케팅 원론',
        category: 'major-req',
        categoryName: '경영전공필수',
        prof: '서지현 교수',
        room: '경영관 101호',
        credits: 3,
        eval: '마케팅 기초 개념 및 STP 전략 실전 케이스 분석. 비즈니스 프리젠테이션 발표 과제 포함.',
        slots: [
            { day: 3, start: 15, end: 17 } // 수 15:00-17:00
        ]
    }
};

// Application State Variables
let currentStudentType = 'transfer';
let activeCourses = []; // List of course objects currently placed in timetable
let isConfirmed = false;

// Student Profile Settings Data
const STUDENT_PROFILES = {
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
        warningText: '융합교양 3영역 3학점 미이수',
        diagnosticBrief: '김경상님, 졸업 요건을 충족하기 위해 이번 학기에 <strong>융합교양 3영역(기술과 인류) 3학점</strong> 이수가 반드시 필요합니다.',
        diagnosticBullets: [
            { type: 'red', text: '융합교양 3영역 누락 (3학점)' },
            { type: 'yellow', text: '전공 필수 이수 요건 미달 (잔여 12학점 필요)' }
        ],
        welcomeMsg: '안녕하세요 김경상님! GNU AI 네비게이터입니다. 현재 학적(편입생) 기준 졸업 누락 요건이 존재합니다. 무엇을 도와드릴까요?',
        chips: [
            { label: '융합교양 3영역 교과목 리스트 보여줘', id: 'converge-list' },
            { label: '금공강 + 융합교양 포함 15학점 시간표 짜줘', id: 'auto-schedule' },
            { label: '남은 전공 필수 과목 추천해줘', id: 'major-req-list' }
        ]
    },
    'general': {
        name: '박경상',
        badge: '일반재학생',
        major: '컴퓨터공학과 | 3학년',
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
        initialCourses: ['data-struct', 'db', 'network', 'software-eng'],
        warningText: '균형교양 4영역 3학점 미이수',
        diagnosticBrief: '박경상님, 졸업 요건을 충족하기 위해 이번 학기에 <strong>균형교양 4영역(예술과 생활) 3학점</strong> 이수가 필요합니다.',
        diagnosticBullets: [
            { type: 'red', text: '균형교양 4영역 누락 (3학점)' },
            { type: 'yellow', text: '전공 필수 이수 요건 미달 (잔여 6학점 필요)' }
        ],
        welcomeMsg: '안녕하세요 박경상님! GNU AI 네비게이터입니다. 현재 3학년 2학기 진입 기준, 균형교양과 전공 필수 과목 보충이 필요합니다. 원하시는 추천 방향을 말씀해주세요.',
        chips: [
            { label: '균형교양 4영역 과목 추천해줘', id: 'balance-list' },
            { label: '전공 18학점 채우고 하루 공강 시간표 짜줘', id: 'general-schedule' },
            { label: '전필 미이수 과목 확인하기', id: 'general-major-req' }
        ]
    },
    'double-major': {
        name: '이경상',
        badge: '다전공자',
        major: '컴퓨터공학+경영학 | 3학년',
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
        initialCourses: ['data-struct', 'db', 'network'],
        warningText: '다전공(경영) 필수 3학점 미이수',
        diagnosticBrief: '이경상님, 다전공(경영학) 졸업 요건을 충족하기 위해 경영전공 필수 <strong>마케팅원론(3학점)</strong> 이수가 반드시 필요합니다.',
        diagnosticBullets: [
            { type: 'red', text: '경영전공 필수 누락 (3학점)' },
            { type: 'yellow', text: '융합교양 3영역 누락 (3학점)' }
        ],
        welcomeMsg: '안녕하세요 이경상님! 다전공 설계 AI 네비게이터입니다. 주전공(컴공)과 복수전공(경영) 졸업 요건을 모두 충족시킬 수 있는 시뮬레이션을 도와드리겠습니다.',
        chips: [
            { label: '경영학 전공 필수 리스트 보여줘', id: 'double-major-list' },
            { label: '융합교양+경영전필 포함 18학점 설계해줘', id: 'double-schedule' }
        ]
    }
};

// ================= DYNAMIC TIMETABLE ENGINE =================
function renderTimetable() {
    const container = document.getElementById('course-overlay');
    container.innerHTML = ''; // Clear previous blocks
    
    activeCourses.forEach(course => {
        course.slots.forEach(slot => {
            const block = document.createElement('div');
            block.className = `course-block ${course.category}`;
            block.setAttribute('data-id', course.id);
            
            // Calculate CSS grid row values
            const startRow = slot.start - 8;
            const endRow = slot.end - 8;
            
            block.style.gridColumn = slot.day;
            block.style.gridRow = `${startRow} / ${endRow}`;
            
            block.innerHTML = `
                <div class="course-info-top">
                    <h4>${course.title}</h4>
                    <span>${course.categoryName}</span>
                </div>
                <div class="course-info-bottom">
                    <span class="prof">${course.prof}</span>
                    <span class="room">${course.room}</span>
                </div>
            `;
            
            // Interaction: Open detail modal on click
            block.addEventListener('click', () => {
                openCourseModal(course);
            });
            
            // Hover highlight: Select all blocks belonging to the same course
            block.addEventListener('mouseenter', () => {
                document.querySelectorAll(`.course-block[data-id="${course.id}"]`).forEach(el => {
                    el.style.transform = 'translateY(-2px) scale(1.03)';
                    el.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
                    el.style.filter = 'brightness(1.2)';
                });
            });
            block.addEventListener('mouseleave', () => {
                document.querySelectorAll(`.course-block[data-id="${course.id}"]`).forEach(el => {
                    el.style.transform = '';
                    el.style.boxShadow = '';
                    el.style.filter = '';
                });
            });
            
            container.appendChild(block);
        });
    });
    
    // Refresh Icons for course blocks if needed
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ================= DASHBOARD & STATE UPDATES =================
function updateDashboard() {
    const profile = STUDENT_PROFILES[currentStudentType];
    
    // Update basic profile details
    document.querySelector('.profile-info h3').innerHTML = `${profile.name} <span class="badge">${profile.badge}</span>`;
    document.querySelector('.profile-info p').textContent = profile.major;
    
    // Calculate current totals from active courses
    let addedCredits = activeCourses.reduce((sum, c) => sum + c.credits, 0);
    // Note: in active courses we only model the CURRENT semester load.
    // The profile has pre-existing accumulated credits.
    let baseCredits = profile.credits.total;
    let finalCredits = baseCredits + addedCredits;
    if (isConfirmed) {
        // If confirmed, make the dashboard progress bar match the total including added courses permanently
        document.getElementById('total-percent-text').textContent = `${Math.round((finalCredits / profile.credits.totalGoal) * 100)}%`;
        document.getElementById('total-credits-text').textContent = `${finalCredits} / ${profile.credits.totalGoal}학점`;
        // Recalculate conic progress degrees
        const degrees = (finalCredits / profile.credits.totalGoal) * 360;
        document.getElementById('total-progress-circle').style.background = `conic-gradient(var(--color-primary) 0deg, var(--color-secondary) ${degrees}deg, rgba(255, 255, 255, 0.05) ${degrees}deg 360deg)`;
    } else {
        document.getElementById('total-percent-text').textContent = `${Math.round((baseCredits / profile.credits.totalGoal) * 100)}%`;
        document.getElementById('total-credits-text').textContent = `${baseCredits} / ${profile.credits.totalGoal}학점`;
        const degrees = (baseCredits / profile.credits.totalGoal) * 360;
        document.getElementById('total-progress-circle').style.background = `conic-gradient(var(--color-primary) 0deg, var(--color-secondary) ${degrees}deg, rgba(255, 255, 255, 0.05) ${degrees}deg 360deg)`;
    }

    // Determine category credit counts by looking at activeCourses
    let activeMajorReq = activeCourses.filter(c => c.category === 'major-req').reduce((sum, c) => sum + c.credits, 0);
    let activeMajorOpt = activeCourses.filter(c => c.category === 'major-opt').reduce((sum, c) => sum + c.credits, 0);
    let activeConverge = activeCourses.filter(c => c.category === 'converge-edu').reduce((sum, c) => sum + c.credits, 0);
    let activeBalance = activeCourses.filter(c => c.category === 'balance-edu').reduce((sum, c) => sum + c.credits, 0);
    
    // Add current semester choices to base profiles (if confirmed or just live previewing)
    let displayMajorReq = profile.credits.majorReq + (isConfirmed ? activeMajorReq : 0);
    let displayMajorOpt = profile.credits.majorOpt + (isConfirmed ? activeMajorOpt : 0);
    let displayCoreEdu = profile.credits.coreEdu;
    let displayBalanceEdu = profile.credits.balanceEdu + (isConfirmed ? activeBalance : 0);
    let displayConvergeEdu = profile.credits.convergeEdu + (isConfirmed ? activeConverge : 0);
    
    // Major Req Bar
    document.getElementById('major-req-val').textContent = `${displayMajorReq} / ${profile.credits.majorReqGoal}학점`;
    const mrPercent = Math.min((displayMajorReq / profile.credits.majorReqGoal) * 100, 100);
    document.getElementById('major-req-fill').style.width = `${mrPercent}%`;
    
    // Major Opt Bar
    document.getElementById('major-opt-val').textContent = `${displayMajorOpt} / ${profile.credits.majorOptGoal}학점`;
    const moPercent = Math.min((displayMajorOpt / profile.credits.majorOptGoal) * 100, 100);
    document.getElementById('major-opt-fill').style.width = `${moPercent}%`;

    // Core Edu Bar (always full in this mockup)
    document.getElementById('core-edu-val').textContent = `${displayCoreEdu} / ${profile.credits.coreEduGoal}학점`;
    document.getElementById('core-edu-fill').style.width = '100%';

    // Balance Edu Bar
    document.getElementById('balance-edu-val').textContent = `${displayBalanceEdu} / ${profile.credits.balanceEduGoal}학점`;
    const bePercent = Math.min((displayBalanceEdu / profile.credits.balanceEduGoal) * 100, 100);
    document.getElementById('balance-edu-fill').style.width = `${bePercent}%`;
    if (bePercent >= 100) {
        document.getElementById('balance-edu-fill').parentElement.className = "progress-bar-bg success";
    } else {
        document.getElementById('balance-edu-fill').parentElement.className = "progress-bar-bg";
    }

    // Converge Edu Bar
    document.getElementById('converge-edu-val').textContent = `${displayConvergeEdu} / ${profile.credits.convergeEduGoal}학점`;
    const cePercent = Math.min((displayConvergeEdu / profile.credits.convergeEduGoal) * 100, 100);
    document.getElementById('converge-edu-fill').style.width = `${cePercent}%`;
    
    const warnLabel = document.getElementById('converge-edu-warning');
    const barBg = document.getElementById('converge-edu-bar-bg');
    if (cePercent >= 100) {
        barBg.className = "progress-bar-bg success";
        if (warnLabel) warnLabel.style.display = 'none';
    } else {
        barBg.className = "progress-bar-bg warning";
        if (warnLabel) {
            warnLabel.style.display = 'flex';
            warnLabel.textContent = `⚠️ ${profile.warningText}`;
        }
    }

    // Update Real-time Diagnostic Widget state
    const diagWidget = document.getElementById('diagnostic-widget');
    const diagDesc = document.getElementById('diagnostic-desc');
    const diagBullets = document.getElementById('diagnostic-bullets');
    
    if (isConfirmed) {
        // If confirmed, clear issues
        diagWidget.className = "diagnostic-card resolved-state";
        diagWidget.querySelector('.pulse-icon').className = "pulse-icon success";
        diagWidget.querySelector('.pulse-icon i').setAttribute('data-lucide', 'check-circle-2');
        diagDesc.innerHTML = `${profile.name}님, 분석 완료! **이번 학기 학업 계획 수립이 졸업 기준에 완벽히 부합합니다.** 수강 누락 요건이 없습니다.`;
        diagBullets.innerHTML = `
            <div class="bullet-item">
                <span class="indicator" style="background: var(--color-success); box-shadow: 0 0 6px var(--color-success)"></span>
                <span>모든 졸업 누락 영역 이수 계획 반영됨</span>
            </div>
            <div class="bullet-item">
                <span class="indicator" style="background: var(--color-success); box-shadow: 0 0 6px var(--color-success)"></span>
                <span>총 ${finalCredits}학점 달성 예정</span>
            </div>
        `;
    } else {
        // Warning state
        diagWidget.className = "diagnostic-card warning-state";
        diagWidget.querySelector('.pulse-icon').className = "pulse-icon warning";
        diagWidget.querySelector('.pulse-icon i').setAttribute('data-lucide', 'alert-triangle');
        diagDesc.innerHTML = profile.diagnosticBrief;
        
        diagBullets.innerHTML = '';
        profile.diagnosticBullets.forEach(bullet => {
            const item = document.createElement('div');
            item.className = `bullet-item ${bullet.type}-alert`;
            item.innerHTML = `
                <span class="indicator"></span>
                <span>${bullet.text}</span>
            `;
            diagBullets.appendChild(item);
        });
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Load profile state
function loadProfile(profileKey) {
    currentStudentType = profileKey;
    isConfirmed = false;
    const profile = STUDENT_PROFILES[profileKey];
    
    // Load pre-loaded timetable courses
    activeCourses = [];
    profile.initialCourses.forEach(id => {
        if (COURSE_CATALOG[id]) {
            activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG[id])));
        }
    });

    renderTimetable();
    updateDashboard();

    // Reset Chat Messages with bot welcome message
    const chatContainer = document.getElementById('chat-messages-container');
    chatContainer.innerHTML = '';
    
    // Add Welcome message
    addChatMessage('bot', profile.welcomeMsg);

    // Render Quick Action Chips
    const chipsContainer = document.getElementById('quick-action-chips');
    chipsContainer.innerHTML = '';
    profile.chips.forEach(chip => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.setAttribute('data-prompt', chip.id);
        btn.textContent = chip.label;
        btn.addEventListener('click', () => {
            handleQuickChip(chip.id, chip.label);
        });
        chipsContainer.appendChild(btn);
    });
}

// ================= COURSE MODAL DETAILS =================
function openCourseModal(course) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-category').textContent = course.categoryName;
    document.getElementById('modal-category').className = `category-tag ${course.category}`;
    document.getElementById('modal-title').textContent = course.title;
    document.getElementById('modal-prof').textContent = course.prof;
    document.getElementById('modal-credits').textContent = `${course.credits}학점`;
    
    // Compose schedule times string
    const dayNames = ['', '월요일', '화요일', '수요일', '목요일', '금요일'];
    const timeStrings = course.slots.map(s => `${dayNames[s.day]} ${s.start}:00 - ${s.end}:00`);
    document.getElementById('modal-time').textContent = timeStrings.join(', ');
    document.getElementById('modal-room').textContent = course.room;
    document.getElementById('modal-eval').textContent = course.eval;

    modal.classList.add('show');
}

function closeCourseModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('show');
}

// ================= AI CHAT COMPONENT =================
function addChatMessage(sender, text, htmlContent = null) {
    const chatContainer = document.getElementById('chat-messages-container');
    
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = sender === 'bot' ? '<i data-lucide="bot"></i>' : '<i data-lucide="user"></i>';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (htmlContent) {
        bubble.innerHTML = htmlContent;
    } else {
        bubble.innerHTML = `<p>${text}</p>`;
    }
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function showTypingIndicator() {
    const chatContainer = document.getElementById('chat-messages-container');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot typing-indicator-wrapper';
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = '<i data-lucide="bot"></i>';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator-wrapper');
    if (indicator) {
        indicator.remove();
    }
}

function addCourseFromChat(courseId) {
    if (activeCourses.some(c => c.id === courseId)) {
        addChatMessage('bot', `이미 시간표에 등록된 과목입니다.`);
        return;
    }
    
    const course = COURSE_CATALOG[courseId];
    if (course) {
        activeCourses.push(JSON.parse(JSON.stringify(course)));
        renderTimetable();
        updateDashboard();
        addChatMessage('bot', `<strong>${course.title}</strong> 과목을 시간표에 성공적으로 등록했습니다!`);
    }
}

// Handle chatbot action choices
function handleQuickChip(promptId, label) {
    addChatMessage('user', label);
    showTypingIndicator();
    
    setTimeout(() => {
        removeTypingIndicator();
        
        if (currentStudentType === 'transfer') {
            if (promptId === 'converge-list') {
                const htmlContent = `
                    <p>융합교양 3영역(기술과 인류) 추천 리스트입니다. 클릭 시 시간표에 등록됩니다:</p>
                    <div class="msg-course-list">
                        <div class="msg-course-card" onclick="addCourseFromChat('tech-society')">
                            <div class="c-info">
                                <h5>기술과 현대사회 (금 10-12)</h5>
                                <span>3학점 | 최은정 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                        <div class="msg-course-card" onclick="addCourseFromChat('pop-art')">
                            <div class="c-info">
                                <h5>대중예술의 이해 (금 13-15)</h5>
                                <span>3학점 | 장기하 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                    </div>
                `;
                addChatMessage('bot', '', htmlContent);
            }
            else if (promptId === 'auto-schedule') {
                // Clear recommended courses first if they exist to prevent duplicates
                activeCourses = activeCourses.filter(c => c.id !== 'algorithm' && c.id !== 'tech-society-thu');
                
                // Add optimized courses
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['algorithm'])));
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['tech-society-thu'])));
                
                renderTimetable();
                updateDashboard();
                
                const htmlContent = `
                    <p>김경상님의 요구사항을 충족하는 <strong>최적의 15학점 금공강 시간표</strong>를 수뮬레이션했습니다.</p>
                    <p><strong>추천 추가 과목:</strong></p>
                    <p>1. <strong>알고리즘 및 실습</strong> (전공필수, 3학점) [화9-10, 목9-11]<br>
                       2. <strong>기술과 현대사회 (목반)</strong> (융합교양, 3학점) [목15-17]</p>
                    <p>금요일 전체가 비어 있는 효율적인 시간표입니다. 확인해 보세요!</p>
                `;
                addChatMessage('bot', '', htmlContent);
            }
            else if (promptId === 'major-req-list') {
                const htmlContent = `
                    <p>미이수 전공 필수 과목 추천 리스트입니다. 수강할 과목을 클릭해 추가하세요:</p>
                    <div class="msg-course-list">
                        <div class="msg-course-card" onclick="addCourseFromChat('algorithm')">
                            <div class="c-info">
                                <h5>알고리즘 및 실습 (화9-10, 목9-11)</h5>
                                <span>3학점 | 홍길동 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                        <div class="msg-course-card" onclick="addCourseFromChat('os')">
                            <div class="c-info">
                                <h5>운영체제 시스템 (수14-16, 금14-15)</h5>
                                <span>3학점 | 백지훈 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                    </div>
                `;
                addChatMessage('bot', '', htmlContent);
            }
        }
        else if (currentStudentType === 'general') {
            if (promptId === 'balance-list') {
                const htmlContent = `
                    <p>균형교양 4영역(예술과 생활) 개설 추천 과목입니다:</p>
                    <div class="msg-course-list">
                        <div class="msg-course-card" onclick="addCourseFromChat('art-life')">
                            <div class="c-info">
                                <h5>예술과 현대생활 (월 15-17)</h5>
                                <span>3학점 | 윤아름 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                    </div>
                `;
                addChatMessage('bot', '', htmlContent);
            }
            else if (promptId === 'general-schedule') {
                activeCourses = activeCourses.filter(c => c.id !== 'algorithm' && c.id !== 'art-life');
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['algorithm'])));
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['art-life'])));
                
                renderTimetable();
                updateDashboard();
                
                addChatMessage('bot', `금요일 전체 수업을 배제하고, 균형교양 '예술과 현대생활'과 전공필수 '알고리즘'을 추가한 18학점 설계를 완성했습니다. 시간표를 확인해주세요!`);
            }
            else if (promptId === 'general-major-req') {
                const htmlContent = `
                    <p>미이수 전공 필수 교과목 목록입니다:</p>
                    <div class="msg-course-list">
                        <div class="msg-course-card" onclick="addCourseFromChat('algorithm')">
                            <div class="c-info">
                                <h5>알고리즘 및 실습 (화9-10, 목9-11)</h5>
                                <span>3학점 | 홍길동 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                        <div class="msg-course-card" onclick="addCourseFromChat('security')">
                            <div class="c-info">
                                <h5>정보보안 개론 (목 15-17)</h5>
                                <span>3학점 | 김철수 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                    </div>
                `;
                addChatMessage('bot', '', htmlContent);
            }
        }
        else if (currentStudentType === 'double-major') {
            if (promptId === 'double-major-list') {
                const htmlContent = `
                    <p>다전공(경영학) 필수 누락 교과목 리스트입니다:</p>
                    <div class="msg-course-list">
                        <div class="msg-course-card" onclick="addCourseFromChat('marketing')">
                            <div class="c-info">
                                <h5>마케팅 원론 (수 15-17)</h5>
                                <span>3학점 | 서지현 교수</span>
                            </div>
                            <i data-lucide="plus-circle"></i>
                        </div>
                    </div>
                `;
                addChatMessage('bot', '', htmlContent);
            }
            else if (promptId === 'double-schedule') {
                activeCourses = activeCourses.filter(c => c.id !== 'marketing' && c.id !== 'tech-society-thu');
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['marketing'])));
                activeCourses.push(JSON.parse(JSON.stringify(COURSE_CATALOG['tech-society-thu'])));
                
                renderTimetable();
                updateDashboard();
                
                addChatMessage('bot', `주전공 융합교양 이수와 다전공 경영 전필 요건인 '마케팅 원론'을 함께 만족하는 18학점 더블 로드맵 조합을 시간표에 배정 완료했습니다!`);
            }
        }
    }, 800);
}

// Handle free text chat input
function handleSendInput() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    addChatMessage('user', text);
    input.value = '';
    
    showTypingIndicator();
    
    setTimeout(() => {
        removeTypingIndicator();
        
        // Simple NLP trigger response rules
        const lowerText = text.toLowerCase();
        if (lowerText.includes('금공강') || lowerText.includes('공강')) {
            handleQuickChip('auto-schedule', '금공강 시간표 요청');
        } else if (lowerText.includes('융합교양') || lowerText.includes('교양')) {
            handleQuickChip('converge-list', '융합교양 리스트 요청');
        } else if (lowerText.includes('전공') || lowerText.includes('전필')) {
            handleQuickChip('major-req-list', '전공 필수 추천 요청');
        } else {
            addChatMessage('bot', `죄송합니다. 현재 데모 버전에서는 수강신청 누락 요건 분석과 관련된 대화 명령어(예: '금공강 시간표 짜줘', '융합교양 리스트 보여줘')에 최적화되어 있습니다. 퀵 질문 버튼을 활용해 보시면 더욱 상세한 시뮬레이션이 가능합니다.`);
        }
    }, 800);
}

// Handle transcript image upload and OCR simulation analysis
function handleImageUpload(file) {
    // Show image preview in chat
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgHtml = `<p>📎 성적표 이미지를 전송했습니다.</p><img src="${e.target.result}" class="uploaded-image" alt="Uploaded Transcript">`;
        addChatMessage('user', '', imgHtml);
        
        // Show AI thinking spinner
        showTypingIndicator();
        
        setTimeout(() => {
            removeTypingIndicator();
            
            // Apply analysis updates dynamically based on current student type
            const profile = STUDENT_PROFILES[currentStudentType];
            
            if (currentStudentType === 'transfer') {
                // Transfer student updates
                profile.credits.majorReq = 24; // Fulfill major required (from 12)
                profile.credits.convergeEdu = 6; // Fulfill convergence (from 3)
                profile.credits.total = 93; // 84 + 12 - 3 (re-evaluated credits)
                profile.warningText = '융합교양 요건 충족됨';
                profile.diagnosticBrief = '김경상님, 성적표 분석 결과 **융합교양 3영역(기술과 인류) 및 전공필수 12학점**이 소급 적용되어 이수가 인정되었습니다!';
                profile.diagnosticBullets = [
                    { type: 'success', text: '융합교양 3영역 이수 인정 완료 (3학점)' },
                    { type: 'success', text: '전공 필수 이수 요건 충족 (24학점 달성)' }
                ];
                
                updateDashboard();
                
                const responseHtml = `
                    <p>🔍 <strong>성적표 캡처본 자동 분석 결과:</strong></p>
                    <p>1. <strong>전필 전적대 학점 인정</strong>: 전공필수 과목 12학점이 전적대 이수로 정식 승인되어 잔여 전필 기준(24학점)을 전원 달성했습니다.</p>
                    <p>2. <strong>교양 인정</strong>: 전적대에서 이수한 교과목 중 '기술과 사회'가 융합교양 3영역으로 대체 매핑되어 미이수 상태가 해제되었습니다.</p>
                    <p>🎉 축하합니다! 학적 분석에 따라 졸업에 누락된 필수 교과목이 없습니다.</p>
                `;
                addChatMessage('bot', '', responseHtml);
            } 
            else if (currentStudentType === 'general') {
                // General student updates
                profile.credits.balanceEdu = 12; // Fulfill balance edu
                profile.credits.majorReq = 24; // Fulfill major req
                profile.credits.total = 105;
                profile.warningText = '균형교양 요건 충족됨';
                profile.diagnosticBrief = '박경상님, 성적표 분석 결과 **균형교양 4영역 및 전공필수 6학점** 이수가 승인되었습니다!';
                profile.diagnosticBullets = [
                    { type: 'success', text: '균형교양 4영역 이수 인정 완료 (3학점)' },
                    { type: 'success', text: '전공필수 이수 요건 충족 (24학점 달성)' }
                ];
                
                updateDashboard();
                
                const responseHtml = `
                    <p>🔍 <strong>성적표 캡처본 자동 분석 결과:</strong></p>
                    <p>1. <strong>균형교양 4영역 인정</strong>: 전적 성적표의 예술 과목이 균형교양 4영역으로 인정 완료되었습니다.</p>
                    <p>2. <strong>전필 학점 보완</strong>: 누락되었던 전공필수 6학점이 정상 인정 처리되었습니다.</p>
                    <p>🎉 졸업 누락 경고가 모두 해결되었습니다!</p>
                `;
                addChatMessage('bot', '', responseHtml);
            }
            else if (currentStudentType === 'double-major') {
                // Double major updates
                profile.credits.convergeEdu = 6; // Fulfill converge
                profile.credits.total = 81;
                profile.diagnosticBrief = '이경상님, 성적표 분석 결과 **융합교양 3영역(3학점)** 대체 이수가 인정되었습니다!';
                profile.diagnosticBullets = [
                    { type: 'success', text: '융합교양 3영역 이수 인정 완료' },
                    { type: 'yellow', text: '다전공 경영 필수 마케팅원론(3학점) 미이수 상태' }
                ];
                
                updateDashboard();
                
                const responseHtml = `
                    <p>🔍 <strong>성적표 캡처본 자동 분석 결과:</strong></p>
                    <p>1. <strong>융합교양 3영역 인정</strong>: 융합교양 3영역(기술과 인류) 대체 이수가 확인되어 반영되었습니다.</p>
                    <p>⚠️ 경영 전공필수인 <strong>마케팅원론</strong>은 여전히 미이수 상태입니다. 오른쪽 퀵 버튼으로 시간표에 추가해보세요.</p>
                `;
                addChatMessage('bot', '', responseHtml);
            }
            
            // Clear input
            document.getElementById('image-upload-input').value = '';
        }, 1800);
    };
    reader.readAsDataURL(file);
}

// ================= EVENT LISTENERS & INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Load Initial Profile
    loadProfile('transfer');
    
    // 2. Profile Switcher handler
    const switcher = document.getElementById('student-type-select');
    switcher.addEventListener('change', (e) => {
        loadProfile(e.target.value);
    });

    // 3. Confirm Plan button handler
    const confirmBtn = document.getElementById('confirm-plan-btn');
    confirmBtn.addEventListener('click', () => {
        isConfirmed = true;
        updateDashboard();
        addChatMessage('bot', `🎉 축하합니다! <strong>수강 계획이 성공적으로 확정되었습니다.</strong> 대시보드의 총 달성 학점 진행도에 계획된 학점이 누적 반영되었습니다. 이번 학기를 차질없이 이수하시면 졸업 자격이 충족됩니다.`);
        
        // Disable button click feedback and visual highlight
        confirmBtn.innerHTML = `<i data-lucide="check"></i> 계획 확정됨`;
        confirmBtn.style.background = 'var(--color-success)';
        confirmBtn.style.color = '#FFF';
        confirmBtn.style.boxShadow = 'none';
        confirmBtn.style.cursor = 'default';
        confirmBtn.style.pointerEvents = 'none';

        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    // 4. Reset Timetable button handler
    const resetBtn = document.getElementById('reset-timetable-btn');
    resetBtn.addEventListener('click', () => {
        // Reset confirmation state
        isConfirmed = false;
        
        // Re-enable confirm button styling
        confirmBtn.innerHTML = `<i data-lucide="check-circle-2"></i> 계획 확정`;
        confirmBtn.style.background = '';
        confirmBtn.style.color = '';
        confirmBtn.style.boxShadow = '';
        confirmBtn.style.cursor = '';
        confirmBtn.style.pointerEvents = '';
        
        loadProfile(currentStudentType);
        addChatMessage('bot', `시간표 수강 계획이 초기화되었습니다. 학과 기본 수강 과목만 남겨 두었으니 다시 설계해 보세요.`);
    });

    // 5. Modal Close handler
    document.getElementById('close-modal-btn').addEventListener('click', closeCourseModal);
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detail-modal')) {
            closeCourseModal();
        }
    });

    // 6. Chat Input handlers
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendInput();
        }
    });
    
    document.getElementById('btn-chat-send').addEventListener('click', handleSendInput);

    // 7. Image Upload handlers
    const uploadBtn = document.getElementById('btn-image-upload');
    const uploadInput = document.getElementById('image-upload-input');
    
    if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener('click', () => {
            uploadInput.click();
        });
        
        uploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }

    // Bind globally for inline onclick execution in message list
    window.addCourseFromChat = addCourseFromChat;

    // 8. Render initial Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
