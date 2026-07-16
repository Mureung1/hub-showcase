const API_BASE = 'http://localhost:5000/api';

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

    // Add active class to clicked tab button
    event.target.classList.add('active');

    // Load tab-specific data
    if (tabName === 'dashboard') {
        loadTeacherDashboard();
        document.getElementById('action-buttons').style.display = 'flex';
    } else if (tabName === 'evaluation') {
        loadQuestionsList();
        document.getElementById('action-buttons').style.display = 'none';
    } else if (tabName === 'students') {
        loadStudentsList();
        document.getElementById('action-buttons').style.display = 'none';
    }
}

function showStudentPage() {
    showPage('student-page');
    loadStudentQuestions();
}

// Login handlers
async function loginAsTeacher() {
    const name = document.getElementById('teacher-name').value.trim();
    if (!name) {
        alert('선생님 이름을 입력해주세요.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/teacher/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!response.ok) throw new Error(`teacher/create ${response.status}`);
        const data = await response.json();

        currentUser = {
            type: 'teacher',
            id: data.id,
            name: data.name || name,
            classroomId: null
        };

        // Create a test classroom (실패 시 예외를 던져 아래 catch로)
        await createTestClassroom();
        showTeacherDashboard();
    } catch (error) {
        console.error('선생님 로그인 중 오류:', error);
        alert('로그인에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

async function createTestClassroom() {
    const response = await fetch(`${API_BASE}/classroom/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: '수학 1반',
            teacher_id: currentUser.id
        })
    });

    if (!response.ok) throw new Error(`classroom/create ${response.status}`);
    const data = await response.json();
    currentUser.classroomId = data.id;
}

async function loginAsStudent() {
    const name = document.getElementById('student-name').value.trim();
    const classroomId = document.getElementById('classroom-id').value.trim();

    if (!name || !classroomId) {
        alert('학생 이름과 교실 ID를 입력해주세요.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/student/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                classroom_id: classroomId
            })
        });

        if (!response.ok) throw new Error(`student/create ${response.status}`);
        const data = await response.json();

        currentUser = {
            type: 'student',
            id: data.id,
            name: data.name || name,
            classroomId: classroomId
        };

        showStudentPage();
    } catch (error) {
        console.error('학생 로그인 중 오류:', error);
        alert('로그인에 실패했습니다. 교실 ID가 올바른지, 서버가 실행 중인지 확인해주세요.');
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

        loadTeacherDashboard();
    } catch (error) {
        console.error('학생 추가 실패:', error);
    }
}

async function addTestQuestion() {
    if (!currentUser.classroomId) return;

    const questionText = prompt('질문을 입력하세요:');
    if (!questionText) return;

    const modelAnswer = prompt('모범답안을 입력하세요 (비워두면 AI가 스스로 판단합니다):') || '';

    try {
        const response = await fetch(`${API_BASE}/question/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: questionText,
                model_answer: modelAnswer,
                classroom_id: currentUser.classroomId
            })
        });

        if (!response.ok) {
            alert('질문 추가에 실패했습니다. 다시 로그인한 뒤 시도해주세요.');
            return;
        }

        alert('질문이 추가되었습니다. "평가" 탭에서 확인할 수 있어요.');
        loadQuestionsList();
    } catch (error) {
        console.error('질문 추가 실패:', error);
        alert('서버에 연결하지 못했습니다.');
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
            card.innerHTML = `
                <div class="card-title">질문 ${index + 1}</div>
                <div class="card-text">${question.text}</div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('질문 목록 로드 실패:', error);
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
                <td><button class="btn btn-secondary" onclick="alert('${student.name} 학생의 상세정보')">보기</button></td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
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
                <div class="question-text">질문 ${index + 1}: ${question.text}</div>
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
