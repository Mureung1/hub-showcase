const API_BASE = 'http://localhost:5000/api';

// 고등학교 수학 과목 → 단원(대단원) 목록. 선생님이 질문을 남길 때 고르는 항목이다.
// (2022 개정 교육과정 기준) 교육과정이 바뀌면 이 표만 고치면 드롭다운에 그대로 반영된다.
const MATH_CURRICULUM = {
    '공통수학1': ['다항식', '방정식과 부등식', '경우의 수', '행렬'],
    '공통수학2': ['도형의 방정식', '집합과 명제', '함수와 그래프'],
    '대수': ['지수함수와 로그함수', '삼각함수', '수열'],
    '미적분Ⅰ': ['함수의 극한과 연속', '미분', '적분'],
    '미적분Ⅱ': ['수열의 극한', '미분법', '적분법'],
    '확률과 통계': ['경우의 수', '확률', '통계'],
    '기하': ['이차곡선', '공간도형과 공간좌표', '벡터']
};

// ===== 함수 그래프 (외부 라이브러리 없이 SVG 로 직접 그림) =====
// AI 는 함수식 문자열만 주고, 실제 그래프는 아래에서 값을 계산해 그린다.
// 안전을 위해 eval/Function 을 쓰지 않고, 화이트리스트 기반의 작은 파서로 평가한다.

const GRAPH_FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log,
    log: (v) => Math.log(v) / Math.LN10 // 상용로그(밑 10)
};
const GRAPH_CONSTS = { pi: Math.PI, e: Math.E };

// 수식 문자열 → 토큰 배열. 허용되지 않은 문자/식별자면 null.
function tokenizeExpr(src) {
    // 곱셈 생략 보정: 2x → 2*x, 2sin(x) → 2*sin(x), 2(x+1) → 2*(x+1)
    const s = src.replace(/\s+/g, '').replace(/(\d)([a-zA-Z(])/g, '$1*$2');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (/[0-9.]/.test(c)) {
            let num = '';
            while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
            const v = parseFloat(num);
            if (!isFinite(v)) return null;
            tokens.push({ t: 'num', v });
        } else if (/[a-zA-Z]/.test(c)) {
            let id = '';
            while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) id += s[i++];
            if (id === 'x') tokens.push({ t: 'var' });
            else if (id in GRAPH_CONSTS) tokens.push({ t: 'num', v: GRAPH_CONSTS[id] });
            else if (id in GRAPH_FUNCS) tokens.push({ t: 'func', v: id });
            else return null;
        } else if ('+-*/^(),'.includes(c)) {
            tokens.push({ t: 'op', v: c });
            i++;
        } else {
            return null;
        }
    }
    return tokens;
}

// 수식 문자열 → (x)=>number 평가 함수. 파싱 실패 시 null. (재귀 하강 파서)
function compileExpr(src) {
    const tokens = tokenizeExpr(src);
    if (!tokens || !tokens.length) return null;
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;

    function parseExpr() {
        let node = parseTerm();
        if (!node) return null;
        while (isOp('+') || isOp('-')) {
            const op = tokens[pos++].v;
            const rhs = parseTerm();
            if (!rhs) return null;
            const l = node, r = rhs;
            node = (x) => (op === '+' ? l(x) + r(x) : l(x) - r(x));
        }
        return node;
    }
    function parseTerm() {
        let node = parseUnary();
        if (!node) return null;
        while (isOp('*') || isOp('/')) {
            const op = tokens[pos++].v;
            const rhs = parseUnary();
            if (!rhs) return null;
            const l = node, r = rhs;
            node = (x) => (op === '*' ? l(x) * r(x) : l(x) / r(x));
        }
        return node;
    }
    // 단항 마이너스는 거듭제곱보다 약하게. (-x^2 = -(x^2))
    function parseUnary() {
        if (isOp('-')) { pos++; const b = parseUnary(); return b ? (x) => -b(x) : null; }
        return parsePower();
    }
    function parsePower() {
        const base = parseBase();
        if (!base) return null;
        if (isOp('^')) {
            pos++;
            const exp = parseUnary(); // 지수는 오른쪽 결합, 2^-x 도 허용
            if (!exp) return null;
            return (x) => Math.pow(base(x), exp(x));
        }
        return base;
    }
    function parseBase() {
        const tok = peek();
        if (!tok) return null;
        if (tok.t === 'num') { pos++; const v = tok.v; return () => v; }
        if (tok.t === 'var') { pos++; return (x) => x; }
        if (tok.t === 'func') {
            pos++;
            if (!isOp('(')) return null;
            pos++;
            const arg = parseExpr();
            if (!arg || !isOp(')')) return null;
            pos++;
            const fn = GRAPH_FUNCS[tok.v];
            return (x) => fn(arg(x));
        }
        if (tok.t === 'op' && tok.v === '(') {
            pos++;
            const e = parseExpr();
            if (!e || !isOp(')')) return null;
            pos++;
            return e;
        }
        return null;
    }

    const fn = parseExpr();
    if (!fn || pos !== tokens.length) return null; // 남은 토큰이 있으면 실패
    return fn;
}

// 저장 형식(문자열 또는 배열) → 함수식 문자열 배열
function normalizeGraphData(graph) {
    if (!graph) return [];
    if (Array.isArray(graph)) return graph.filter((s) => typeof s === 'string' && s.trim());
    if (typeof graph === 'string') {
        const s = graph.trim();
        if (!s) return [];
        if (s.startsWith('[')) {
            try {
                const arr = JSON.parse(s);
                return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string' && v.trim()) : [];
            } catch { return [s]; }
        }
        return [s];
    }
    return [];
}

// 함수식 배열 → SVG 그래프 엘리먼트. 그릴 게 없으면 null.
function buildGraphSvg(expressions) {
    const compiled = expressions.map(compileExpr).filter(Boolean);
    if (!compiled.length) return null;

    const W = 280, H = 200, pad = 8;
    const xmin = -6, xmax = 6, N = 240, CLAMP = 1e4;

    let ymin = Infinity, ymax = -Infinity;
    const series = compiled.map((fn) => {
        const pts = [];
        for (let k = 0; k <= N; k++) {
            const x = xmin + (xmax - xmin) * k / N;
            let y = fn(x);
            if (!isFinite(y)) { pts.push(null); continue; }
            y = Math.max(-CLAMP, Math.min(CLAMP, y));
            pts.push({ x, y });
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
        }
        return pts;
    });
    if (!isFinite(ymin) || !isFinite(ymax)) return null;
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const yspan = ymax - ymin;
    ymin -= yspan * 0.12; ymax += yspan * 0.12;

    const sx = (x) => pad + (x - xmin) / (xmax - xmin) * (W - 2 * pad);
    const sy = (y) => pad + (ymax - y) / (ymax - ymin) * (H - 2 * pad);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'graph-svg');
    svg.setAttribute('role', 'img');

    const addLine = (x1, y1, x2, y2) => {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1);
        l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        l.setAttribute('stroke', '#C7CEDB'); l.setAttribute('stroke-width', '1');
        svg.appendChild(l);
    };
    if (ymin <= 0 && ymax >= 0) addLine(sx(xmin), sy(0), sx(xmax), sy(0)); // x축
    if (xmin <= 0 && xmax >= 0) addLine(sx(0), sy(ymin), sx(0), sy(ymax)); // y축

    const colors = ['#6C8CFF', '#E24D4D', '#34C77B'];
    series.forEach((pts, idx) => {
        let d = '', pen = false;
        pts.forEach((p) => {
            if (!p) { pen = false; return; }
            const X = sx(p.x), Y = sy(p.y);
            if (Y < -H || Y > 2 * H) { pen = false; return; } // 화면 밖은 선을 끊음
            d += (pen ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1) + ' ';
            pen = true;
        });
        if (!d) return;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d.trim());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', colors[idx % colors.length]);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);
    });
    return svg;
}

// graph 데이터를 컨테이너 안에 그래프 박스로 렌더한다. 그릴 게 없으면 아무것도 안 함.
function renderQuestionGraph(container, graph) {
    const svg = buildGraphSvg(normalizeGraphData(graph));
    if (!svg) return;
    const box = document.createElement('div');
    box.className = 'graph-box';
    box.appendChild(svg);
    container.appendChild(box);
}

let currentUser = {
    type: null, // 'teacher' or 'student'
    id: null,
    name: null,
    classroomId: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showLoginPage();
    // Set initial history state
    history.pushState({ page: 'login-page' }, '', window.location.href);
});

// Page navigation with history management
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    // Add to browser history
    history.pushState({ page: pageId }, '', window.location.href);
}

function showLoginPage() {
    showPage('login-page');
}

// Handle browser back button
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) {
        // If going back, return to login
        showLoginPage();
    }
});

function showTeacherDashboard() {
    showPage('teacher-page');
    // 교실 ID 즉시 표시
    document.getElementById('teacher-title').innerText = currentUser.name;
    document.getElementById('classroom-id-display').innerText = currentUser.classroomId;
    switchTab('dashboard');
}

// Tab switching for teacher page
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.nav-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    const tabElement = document.getElementById(`${tabName}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Activate the matching tab button. 클릭이 아니라 로그인 등에서 프로그램적으로
    // 호출될 때도 있으므로 전역 event 대신 tabName으로 버튼을 찾는다.
    const tabButton = document.querySelector(`.nav-tabs .tab[onclick*="'${tabName}'"]`);
    if (tabButton) {
        tabButton.classList.add('active');
    }

    // Load tab-specific data
    if (tabName === 'dashboard') {
        loadTeacherDashboard();
    } else if (tabName === 'evaluation') {
        loadQuestionsList();
    } else if (tabName === 'students') {
        loadStudentsList();
    }
}

function showStudentPage() {
    showPage('student-page');
    loadStudentQuestions();
}

// 로그인 화면의 역할 탭(선생님/학생) 전환
function switchLoginTab(role) {
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.role === role);
    });
    document.getElementById('teacher-login').classList.toggle('active', role === 'teacher');
    document.getElementById('student-login').classList.toggle('active', role === 'student');
}

// Login handlers
async function loginAsTeacher() {
    const name = document.getElementById('teacher-name').value.trim();
    if (!name) {
        alert('선생님 이름을 입력해주세요.');
        return;
    }

    try {
        // 같은 이름이면 기존 교실을 재사용한다. (재로그인해도 학생이 유지되도록)
        const response = await fetch(`${API_BASE}/teacher/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || '로그인에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
            return;
        }

        currentUser = {
            type: 'teacher',
            id: data.id,
            name: data.name || name,
            classroomId: data.classroom_id
        };

        showTeacherDashboard();
    } catch (error) {
        console.error('선생님 로그인 중 오류:', error);
        alert('서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function loginAsStudent() {
    const name = document.getElementById('student-name').value.trim();
    const classroomId = document.getElementById('classroom-id').value.trim();

    if (!name || !classroomId) {
        alert('학생 이름과 교실 ID를 입력해주세요.');
        return;
    }

    try {
        // 선생님이 미리 등록해 둔 학생만 로그인할 수 있다. (신규 생성이 아니라 조회)
        const response = await fetch(`${API_BASE}/student/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                classroom_id: classroomId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || '로그인에 실패했습니다. 교실 ID가 올바른지 확인해주세요.');
            return;
        }

        currentUser = {
            type: 'student',
            id: data.id,
            name: data.name || name,
            classroomId: classroomId
        };

        showStudentPage();
    } catch (error) {
        console.error('학생 로그인 중 오류:', error);
        alert('서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

// Teacher Dashboard
async function loadTeacherDashboard() {
    if (!currentUser.classroomId) return;

    try {
        const response = await fetch(`${API_BASE}/classroom/${currentUser.classroomId}/dashboard`);
        const data = await response.json();

        // Update header
        document.getElementById('teacher-title').innerText = currentUser.name;
        document.getElementById('classroom-name').innerText = data.classroom.name;
        document.getElementById('classroom-id-display').innerText = currentUser.classroomId;

        // Update stats
        const stats = data.stats;
        document.getElementById('stat-students').innerText = stats.total_students;
        document.getElementById('stat-progress').innerText = stats.average_progress + '%';
        document.getElementById('stat-correct').innerText = stats.total_correct + '/' + stats.total_answers;

        // Update student table
        const tbody = document.querySelector('#students-table tbody');
        tbody.innerHTML = '';

        data.students.forEach(student => {
            const row = document.createElement('tr');
            const progressColor = getProgressColor(student.progress);

            row.innerHTML = `
                <td>${student.name}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressColor}" style="width: ${student.progress}%"></div>
                    </div>
                </td>
                <td class="text-center">${student.progress}%</td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('대시보드 로드 실패:', error);
    }
}

function getProgressColor(progress) {
    if (progress >= 90) return 'success';
    if (progress >= 70) return 'info';
    if (progress >= 50) return 'warning';
    return 'error';
}

async function addTestStudent() {
    if (!currentUser.classroomId) return;

    const studentName = prompt('학생 이름을 입력하세요:');
    if (!studentName) return;

    try {
        const response = await fetch(`${API_BASE}/student/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: studentName,
                classroom_id: currentUser.classroomId
            })
        });
        const student = await response.json();

        // Add to classroom
        await fetch(`${API_BASE}/classroom/${currentUser.classroomId}/add-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: student.id })
        });

        await loadTeacherDashboard();
    } catch (error) {
        console.error('학생 추가 실패:', error);
    }
}

async function addTestQuestion() {
    if (!currentUser.classroomId) return;

    // 과목(단원)을 고르고 질문 내용을 입력받는다.
    const result = await showQuestionForm();
    if (!result) return;

    try {
        const response = await fetch(`${API_BASE}/question/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: result.text,
                subject: result.subject,
                unit: result.unit,
                graph: result.graph,
                classroom_id: currentUser.classroomId
            })
        });

        if (!response.ok) {
            showToast('질문 추가에 실패했습니다. 다시 로그인한 뒤 시도해주세요.', 'error');
            return;
        }

        showToast('질문이 추가되었습니다. "평가 관리" 탭에서 확인할 수 있어요.', 'success');
        loadQuestionsList();
    } catch (error) {
        console.error('질문 추가 실패:', error);
        showToast('서버에 연결하지 못했습니다.', 'error');
    }
}

async function loadQuestionsList() {
    if (!currentUser.classroomId) return;

    try {
        const response = await fetch(`${API_BASE}/classroom/${currentUser.classroomId}/questions`);
        const questions = await response.json();

        const container = document.getElementById('questions-list');
        container.innerHTML = '';

        if (questions.length === 0) {
            container.innerHTML = '<p class="text-secondary">등록된 질문이 없습니다.</p>';
            return;
        }

        questions.forEach((question, index) => {
            const card = document.createElement('div');
            card.className = 'card';

            const title = document.createElement('div');
            title.className = 'card-title';
            title.textContent = `질문 ${index + 1}`;

            // 과목·단원이 지정돼 있으면 제목 옆에 배지로 표시한다.
            if (question.subject) {
                const badge = document.createElement('span');
                badge.className = 'subject-badge';
                badge.textContent = question.unit
                    ? `${question.subject} · ${question.unit}`
                    : question.subject;
                title.appendChild(badge);
            }

            const text = document.createElement('div');
            text.className = 'card-text';
            text.textContent = question.text; // 교사 입력이므로 innerHTML 금지

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.style.marginTop = '12px';
            delBtn.textContent = '삭제';
            delBtn.addEventListener('click', () => deleteQuestion(question.id, index + 1));

            card.append(title, text);
            renderQuestionGraph(card, question.graph); // 그래프가 있으면 표시
            card.append(delBtn);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('질문 목록 로드 실패:', error);
    }
}

// ===== 커스텀 확인 모달 & 토스트 (네이티브 confirm/alert 대체) =====
// 네이티브 팝업은 화면을 막고 디자인과 겉돌아서, 인페이지 UI로 대체한다.
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <p class="modal-message"></p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="cancel">취소</button>
                    <button class="btn btn-danger-solid" data-action="ok">삭제</button>
                </div>
            </div>`;
        overlay.querySelector('.modal-message').textContent = message; // 사용자 입력 포함 → textContent
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const close = (result) => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 180);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') close(false);
        };
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) return close(false); // 바깥 클릭 = 취소
            const action = e.target.dataset.action;
            if (action === 'ok') close(true);
            else if (action === 'cancel') close(false);
        });
    });
}

// 질문 생성 폼 모달. 과목(단원) 선택 + 질문 내용을 받아 {subject, text} 로 resolve.
// 취소하면 null 로 resolve 한다.
function showQuestionForm() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal modal-form" role="dialog" aria-modal="true">
                <h3 class="modal-title">새 질문 추가</h3>
                <div class="modal-body">
                <div class="form-group">
                    <label class="form-label" for="q-subject">과목</label>
                    <select id="q-subject" class="form-input form-select"></select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="q-unit">단원</label>
                    <select id="q-unit" class="form-input form-select"></select>
                </div>
                <div class="form-group">
                    <div class="form-label-row">
                        <label class="form-label" for="q-text">질문 내용</label>
                        <button type="button" class="btn btn-ai" data-action="recommend">✨ AI 문제 추천</button>
                    </div>
                    <textarea id="q-text" class="form-textarea"
                        placeholder="직접 입력하거나, ‘AI 문제 추천’으로 후보를 받아보세요..."></textarea>
                    <div id="q-graph-attached" class="q-graph-attached"></div>
                    <div id="q-suggestions" class="q-suggestions"></div>
                </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="cancel">취소</button>
                    <button class="btn btn-primary" data-action="ok">추가</button>
                </div>
            </div>`;

        // 과목 드롭다운을 MATH_CURRICULUM 의 과목명으로 채운다. (textContent 로 안전하게 주입)
        const subjectSelect = overlay.querySelector('#q-subject');
        const unitSelect = overlay.querySelector('#q-unit');
        Object.keys(MATH_CURRICULUM).forEach((subject) => {
            const opt = document.createElement('option');
            opt.value = subject;
            opt.textContent = subject;
            subjectSelect.appendChild(opt);
        });

        // 선택된 과목에 맞는 단원 목록으로 단원 드롭다운을 다시 채운다.
        function populateUnits() {
            unitSelect.innerHTML = '';
            (MATH_CURRICULUM[subjectSelect.value] || []).forEach((unit) => {
                const opt = document.createElement('option');
                opt.value = unit;
                opt.textContent = unit;
                unitSelect.appendChild(opt);
            });
        }
        populateUnits();
        subjectSelect.addEventListener('change', populateUnits);

        // 선택된 그래프(함수식 배열). 문제와 함께 저장되어 학생 화면에도 그려진다.
        let selectedGraph = [];
        const attachedEl = overlay.querySelector('#q-graph-attached');
        function setSelectedGraph(graph) {
            selectedGraph = normalizeGraphData(graph);
            attachedEl.innerHTML = '';
            if (!selectedGraph.length) return;
            const svg = buildGraphSvg(selectedGraph);
            if (!svg) { selectedGraph = []; return; }
            const box = document.createElement('div');
            box.className = 'graph-box';
            box.appendChild(svg);
            const caption = document.createElement('div');
            caption.className = 'q-graph-caption';
            caption.append('이 그래프가 문제와 함께 저장됩니다.');
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'q-graph-remove';
            rm.textContent = '그래프 제거';
            rm.addEventListener('click', () => setSelectedGraph([]));
            caption.appendChild(rm);
            attachedEl.append(box, caption);
        }

        // AI 문제 추천: 선택한 과목·단원으로 후보 문제를 받아 목록으로 보여준다.
        // 후보를 누르면 질문 내용에 채워지고, 그래프가 있으면 함께 첨부된다. (모달은 닫지 않는다)
        const suggestionsEl = overlay.querySelector('#q-suggestions');
        const recommendBtn = overlay.querySelector('[data-action="recommend"]');

        function setSuggestionHint(text, isError) {
            suggestionsEl.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'q-suggestions-hint' + (isError ? ' error' : '');
            p.textContent = text;
            suggestionsEl.appendChild(p);
        }

        async function fetchRecommendations() {
            recommendBtn.disabled = true;
            const originalLabel = recommendBtn.textContent;
            recommendBtn.textContent = '추천 받는 중...';
            setSuggestionHint('AI가 문제를 만들고 있어요... (수 초 걸릴 수 있어요)', false);

            try {
                const res = await fetch(`${API_BASE}/question/recommend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: subjectSelect.value, unit: unitSelect.value })
                });

                // 404(라우트 없음) 등은 JSON이 아닐 수 있다. 파싱 실패를 연결 오류와 구분한다.
                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    if (res.status === 404) {
                        setSuggestionHint('추천 기능을 찾지 못했습니다. 백엔드 서버를 재시작했는지 확인해주세요.', true);
                    } else {
                        setSuggestionHint((data && data.error) || `AI 추천에 실패했습니다. (HTTP ${res.status})`, true);
                    }
                    return;
                }
                if (!data || !Array.isArray(data.questions)) {
                    setSuggestionHint('AI 추천 응답을 읽지 못했습니다. 다시 시도해주세요.', true);
                    return;
                }

                suggestionsEl.innerHTML = '';
                const hint = document.createElement('p');
                hint.className = 'q-suggestions-hint';
                hint.textContent = '추천 문제를 눌러 위 칸에 채워 넣으세요.';
                suggestionsEl.appendChild(hint);

                data.questions.forEach((q) => {
                    // q 는 {text, graph} 객체. (구식 문자열 응답도 관대하게 처리)
                    const text = typeof q === 'string' ? q : (q && q.text) || '';
                    if (!text) return;
                    const graph = typeof q === 'string' ? [] : (q && q.graph) || [];

                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'q-suggestion';

                    const label = document.createElement('span');
                    label.className = 'q-suggestion-text';
                    label.textContent = text; // LLM 출력 → textContent
                    item.appendChild(label);

                    renderQuestionGraph(item, graph); // 그래프가 있으면 미리보기

                    item.addEventListener('click', () => {
                        overlay.querySelector('#q-text').value = text;
                        setSelectedGraph(graph);
                    });
                    suggestionsEl.appendChild(item);
                });
            } catch (error) {
                console.error('AI 추천 실패:', error);
                setSuggestionHint('서버에 연결하지 못했습니다.', true);
            } finally {
                recommendBtn.disabled = false;
                recommendBtn.textContent = originalLabel;
            }
        }

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));
        subjectSelect.focus();

        const close = (result) => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 180);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') close(null);
        };
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) return close(null); // 바깥 클릭 = 취소
            const action = e.target.dataset.action;
            if (action === 'cancel') return close(null);
            if (action === 'recommend') return fetchRecommendations();
            if (action === 'ok') {
                const text = overlay.querySelector('#q-text').value.trim();
                if (!text) {
                    showToast('질문 내용을 입력해주세요.', 'error');
                    return;
                }
                close({ subject: subjectSelect.value, unit: unitSelect.value, text, graph: selectedGraph });
            }
        });
    });
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 2600);
}

async function deleteQuestion(questionId, label) {
    const ok = await showConfirm(`질문 ${label}을(를) 삭제할까요?\n학생들의 관련 답변·대화 기록도 함께 삭제됩니다.`);
    if (!ok) return;

    try {
        const response = await fetch(`${API_BASE}/question/${questionId}`, { method: 'DELETE' });
        if (!response.ok) {
            showToast('질문 삭제에 실패했습니다.', 'error');
            return;
        }
        await loadQuestionsList();
        showToast('질문이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('질문 삭제 실패:', error);
        showToast('서버에 연결하지 못했습니다.', 'error');
    }
}

async function loadStudentsList() {
    if (!currentUser.classroomId) return;

    try {
        const response = await fetch(`${API_BASE}/classroom/${currentUser.classroomId}/students`);
        const students = await response.json();

        const tbody = document.querySelector('#all-students-table tbody');
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-secondary">등록된 학생이 없습니다.</td></tr>';
            return;
        }

        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.name}</td>
                <td>${student.progress}%</td>
                <td>${student.correct}/${student.total}</td>
            `;

            const actionCell = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.textContent = '삭제';
            delBtn.addEventListener('click', () => deleteStudent(student.id, student.name));
            actionCell.appendChild(delBtn);
            row.appendChild(actionCell);

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
    }
}

async function deleteStudent(studentId, studentName) {
    const ok = await showConfirm(`${studentName} 학생을 삭제할까요?\n답변·대화 기록도 함께 삭제됩니다.`);
    if (!ok) return;

    try {
        const response = await fetch(`${API_BASE}/student/${studentId}`, { method: 'DELETE' });
        if (!response.ok) {
            showToast('학생 삭제에 실패했습니다.', 'error');
            return;
        }
        await loadStudentsList();
        // 대시보드 통계도 최신화 (전체 학생 수 등)
        if (document.getElementById('dashboard-tab').classList.contains('active')) {
            await loadTeacherDashboard();
        }
        showToast('학생이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('학생 삭제 실패:', error);
        showToast('서버에 연결하지 못했습니다.', 'error');
    }
}

// Student Page
async function loadStudentQuestions() {
    if (!currentUser.classroomId) return;

    try {
        const response = await fetch(`${API_BASE}/classroom/${currentUser.classroomId}/questions`);
        const questions = await response.json();

        const container = document.getElementById('questions-container');
        container.innerHTML = '';

        if (questions.length === 0) {
            container.innerHTML = '<p class="text-secondary">아직 질문이 없습니다.</p>';
            return;
        }

        questions.forEach((question, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
                <div class="q-eyebrow"></div>
                <h3 class="q-headline"></h3>
                <div class="q-graph"></div>
                <div class="form-group">
                    <textarea
                        id="answer-${question.id}"
                        class="form-textarea"
                        placeholder="답변을 입력하세요..."
                    ></textarea>
                </div>
                <div class="button-container">
                    <button class="btn btn-primary" id="submit-${question.id}" onclick="submitAnswer('${question.id}')">
                        제출
                    </button>
                </div>
                <div id="feedback-${question.id}" class="feedback"></div>

                <button class="btn btn-secondary chat-toggle" onclick="toggleChat('${question.id}')">
                    AI 선생님과 대화하기
                </button>
                <div class="chat-panel" id="chat-panel-${question.id}">
                    <div class="chat-messages" id="chat-messages-${question.id}"></div>
                    <div class="chat-input-row">
                        <textarea class="form-textarea chat-input" id="chat-input-${question.id}"
                            placeholder="궁금한 점을 물어보세요..." rows="2"></textarea>
                        <button class="btn btn-primary" id="chat-send-${question.id}"
                            onclick="sendChatMessage('${question.id}')">전송</button>
                    </div>
                </div>
            `;
            // 과목·단원이 있으면 "질문 N · 과목 · 단원" 형태로 보여준다.
            const tag = [question.subject, question.unit].filter(Boolean).join(' · ');
            card.querySelector('.q-eyebrow').textContent = tag
                ? `질문 ${index + 1} · ${tag}`
                : `질문 ${index + 1}`;
            card.querySelector('.q-headline').textContent = question.text; // 교사 입력 → textContent
            renderQuestionGraph(card.querySelector('.q-graph'), question.graph); // 그래프가 있으면 표시
            container.appendChild(card);
        });

    } catch (error) {
        console.error('질문 로드 실패:', error);
    }
}

async function submitAnswer(questionId) {
    const answerText = document.getElementById(`answer-${questionId}`).value.trim();

    if (!answerText) {
        alert('답변을 입력해주세요.');
        return;
    }

    const button = document.getElementById(`submit-${questionId}`);
    const feedbackEl = document.getElementById(`feedback-${questionId}`);

    // CPU 추론이라 수 초 걸린다. 기다리는 동안 화면이 죽은 것처럼 보이면 안 된다.
    button.disabled = true;
    button.innerText = '채점 중...';
    feedbackEl.className = 'feedback loading';
    feedbackEl.innerText = 'AI 선생님이 답변을 확인하고 있어요...';

    try {
        const response = await fetch(`${API_BASE}/answer/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: questionId,
                student_id: currentUser.id,
                answer_text: answerText
            })
        });

        const data = await response.json();

        if (!response.ok) {
            feedbackEl.className = 'feedback error';
            feedbackEl.innerText = data.error || '채점에 실패했습니다. 다시 시도해주세요.';
            return;
        }

        renderFeedback(feedbackEl, data.is_correct, data.feedback);

    } catch (error) {
        console.error('답변 제출 실패:', error);
        feedbackEl.className = 'feedback error';
        feedbackEl.innerText = '서버에 연결하지 못했습니다.';
    } finally {
        button.disabled = false;
        button.innerText = '제출';
    }
}

function renderFeedback(container, isCorrect, feedback) {
    container.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
    container.innerHTML = '';

    const badge = document.createElement('span');
    badge.className = isCorrect ? 'badge badge-success' : 'badge badge-warning';
    badge.innerText = isCorrect ? '정답' : '다시 생각해보기';

    const text = document.createElement('p');
    text.className = 'feedback-text';
    text.innerText = feedback;  // LLM 출력이므로 innerHTML 금지

    container.appendChild(badge);
    container.appendChild(text);
}

// ===== 대화형 학습 (질문별 채팅) =====
const chatLoaded = new Set(); // 히스토리를 이미 불러온 질문 id

async function toggleChat(questionId) {
    const panel = document.getElementById(`chat-panel-${questionId}`);
    const isOpen = panel.classList.toggle('open');
    if (!isOpen) return;

    // 처음 열 때만 기존 대화를 불러온다.
    if (chatLoaded.has(questionId)) return;
    chatLoaded.add(questionId);

    const messagesEl = document.getElementById(`chat-messages-${questionId}`);
    try {
        const res = await fetch(
            `${API_BASE}/student/${currentUser.id}/question/${questionId}/messages`
        );
        const history = await res.json();
        if (Array.isArray(history) && history.length > 0) {
            history.forEach((m) => appendBubble(messagesEl, m.role, m.content));
        } else {
            appendBubble(messagesEl, 'assistant', '안녕하세요! 이 문제에 대해 궁금한 점을 물어보세요. 함께 생각해봐요.');
        }
    } catch (error) {
        console.error('대화 기록 로드 실패:', error);
    }
}

async function sendChatMessage(questionId) {
    const input = document.getElementById(`chat-input-${questionId}`);
    const sendBtn = document.getElementById(`chat-send-${questionId}`);
    const messagesEl = document.getElementById(`chat-messages-${questionId}`);
    const text = input.value.trim();
    if (!text) return;

    appendBubble(messagesEl, 'user', text);
    input.value = '';

    // CPU 추론이라 수 초 걸린다. 대기 상태를 명확히 보여준다.
    sendBtn.disabled = true;
    sendBtn.innerText = '...';
    const pending = appendBubble(messagesEl, 'assistant', 'AI 선생님이 생각하고 있어요...');
    pending.classList.add('pending');

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentUser.id,
                question_id: questionId,
                message: text
            })
        });
        const data = await res.json();
        pending.remove();

        if (!res.ok) {
            const errBubble = appendBubble(messagesEl, 'assistant', data.error || 'AI 응답에 실패했습니다.');
            errBubble.classList.add('chat-error');
            return;
        }

        appendBubble(messagesEl, 'assistant', data.reply);
    } catch (error) {
        console.error('대화 전송 실패:', error);
        pending.remove();
        const errBubble = appendBubble(messagesEl, 'assistant', '서버에 연결하지 못했습니다.');
        errBubble.classList.add('chat-error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = '전송';
    }
}

function appendBubble(container, role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${role === 'user' ? 'user' : 'assistant'}`;
    bubble.textContent = text; // LLM·사용자 입력이므로 innerHTML 금지
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function logout() {
    currentUser = {
        type: null,
        id: null,
        name: null,
        classroomId: null
    };
    // Clear history when logging out
    history.pushState({ page: 'login-page' }, '', window.location.href);
    showLoginPage();
    document.getElementById('teacher-name').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('classroom-id').value = '';
}

// Copy classroom ID to clipboard
async function copyClassroomId() {
    const classroomId = currentUser.classroomId;

    if (!classroomId) {
        alert('교실 ID가 없습니다.');
        return;
    }

    try {
        await navigator.clipboard.writeText(classroomId);

        // Show success message
        const button = document.getElementById('copy-btn');
        const originalText = button.innerText;
        button.innerText = '복사됨!';
        button.style.backgroundColor = 'var(--success)';
        button.style.color = 'white';

        setTimeout(() => {
            button.innerText = originalText;
            button.style.backgroundColor = '';
            button.style.color = '';
        }, 2000);
    } catch (error) {
        console.error('복사 실패:', error);
        alert('복사 실패했습니다.');
    }
}
