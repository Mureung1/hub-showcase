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
});

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function showLoginPage() {
    showPage('login-page');
}

function showTeacherDashboard() {
    showPage('teacher-page');
    loadTeacherDashboard();
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
        const data = await response.json();

        currentUser = {
            type: 'teacher',
            id: data.id,
            name: data.name,
            classroomId: null
        };

        // Create a test classroom
        await createTestClassroom();
        showTeacherDashboard();
    } catch (error) {
        console.error('선생님 로그인 실패:', error);
        alert('로그인 실패');
    }
}

async function createTestClassroom() {
    try {
        const response = await fetch(`${API_BASE}/classroom/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: '수학 1반',
                teacher_id: currentUser.id
            })
        });
        const data = await response.json();
        currentUser.classroomId = data.id;
    } catch (error) {
        console.error('교실 생성 실패:', error);
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
        const response = await fetch(`${API_BASE}/student/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                classroom_id: classroomId
            })
        });
        const data = await response.json();

        currentUser = {
            type: 'student',
            id: data.id,
            name: data.name,
            classroomId: classroomId
        };

        showStudentPage();
    } catch (error) {
        console.error('학생 로그인 실패:', error);
        alert('로그인 실패');
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

    try {
        await fetch(`${API_BASE}/question/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: questionText,
                classroom_id: currentUser.classroomId
            })
        });

        alert('질문이 추가되었습니다.');
        loadStudentQuestions();
    } catch (error) {
        console.error('질문 추가 실패:', error);
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
                    <button class="btn btn-primary" onclick="submitAnswer('${question.id}')">
                        제출
                    </button>
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

    try {
        const response = await fetch(`${API_BASE}/answer/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: questionId,
                student_id: currentUser.id,
                answer_text: answerText,
                is_correct: Math.random() > 0.5, // Random for demo
                feedback: '좋은 답변입니다! 다음 질문으로 넘어가세요.'
            })
        });

        if (response.ok) {
            alert('답변이 제출되었습니다!');
            document.getElementById(`answer-${questionId}`).value = '';
        }
    } catch (error) {
        console.error('답변 제출 실패:', error);
        alert('제출 실패');
    }
}

function logout() {
    currentUser = {
        type: null,
        id: null,
        name: null,
        classroomId: null
    };
    showLoginPage();
    document.getElementById('teacher-name').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('classroom-id').value = '';
}
