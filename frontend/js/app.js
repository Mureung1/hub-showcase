// 앱 진입점: 페이지 전환, 로그인/로그아웃, 버튼 연결을 담당한다.
// 화면별 세부 동작은 teacher.js / student.js 에 있다.

const LOGIN_PAGE = 'login-page';
const TEACHER_PAGE = 'teacher-page';
const STUDENT_PAGE = 'student-page';

// data-action 값 → 실행할 함수. HTML 에서 onclick 을 쓰지 않고 여기서 연결한다.
const ACTIONS = {
    'login-teacher': loginAsTeacher,
    'login-student': loginAsStudent,
    'logout': logout,
    'copy-classroom-id': copyClassroomId,
    'add-question': promptAddQuestion,
    'add-student': promptAddStudent
};

// 선생님 페이지의 탭 이름 → 탭이 열릴 때 불러올 데이터.
const TAB_LOADERS = {
    dashboard: loadTeacherDashboard,
    evaluation: loadQuestionsList,
    students: loadStudentsList
};

document.addEventListener('DOMContentLoaded', () => {
    connectButtons();
    showLoginPage();
    // 뒤로 가기로 빠져나갈 수 있도록 초기 상태를 하나 쌓아 둔다.
    history.pushState({ page: LOGIN_PAGE }, '', window.location.href);
});

// 클릭은 문서 한곳에서 받아 data-* 속성으로 분기한다.
// 나중에 만들어지는 요소(모달 등)에도 따로 연결할 필요가 없다.
function connectButtons() {
    document.addEventListener('click', (event) => {
        const target = event.target;

        const actionButton = target.closest('[data-action]');
        if (actionButton && ACTIONS[actionButton.dataset.action]) {
            ACTIONS[actionButton.dataset.action]();
            return;
        }

        const tabButton = target.closest('.nav-tabs .tab[data-tab]');
        if (tabButton) {
            switchTab(tabButton.dataset.tab);
            return;
        }

        const loginTab = target.closest('.login-tab[data-role]');
        if (loginTab) switchLoginTab(loginTab.dataset.role);
    });
}

// ===== 페이지 전환 =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    history.pushState({ page: pageId }, '', window.location.href);
}

function showLoginPage() {
    showPage(LOGIN_PAGE);
}

function showTeacherDashboard() {
    showPage(TEACHER_PAGE);
    // 대시보드 데이터를 받기 전에도 교실 ID 는 바로 보여준다.
    document.getElementById('teacher-title').textContent = session.name;
    document.getElementById('classroom-id-display').textContent = session.classroomId;
    switchTab('dashboard');
}

function showStudentPage() {
    showPage(STUDENT_PAGE);
    loadStudentQuestions();
}

// 뒤로 가기는 언제나 로그인 화면으로 돌아온다.
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) showLoginPage();
});

// ===== 탭 =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
    document.querySelectorAll('.nav-tabs .tab').forEach((tab) => tab.classList.remove('active'));

    const content = document.getElementById(`${tabName}-tab`);
    if (content) content.classList.add('active');

    // 클릭이 아니라 로그인 직후처럼 코드에서 부를 때도 있으므로 탭 이름으로 버튼을 찾는다.
    const button = document.querySelector(`.nav-tabs .tab[data-tab="${tabName}"]`);
    if (button) button.classList.add('active');

    const load = TAB_LOADERS[tabName];
    if (load) load();
}

function isTabActive(tabName) {
    const content = document.getElementById(`${tabName}-tab`);
    return Boolean(content) && content.classList.contains('active');
}

// 로그인 화면의 역할 탭(선생님/학생) 전환
function switchLoginTab(role) {
    document.querySelectorAll('.login-tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.role === role);
    });
    document.getElementById('teacher-login').classList.toggle('active', role === 'teacher');
    document.getElementById('student-login').classList.toggle('active', role === 'student');
}

// ===== 로그인 / 로그아웃 =====
async function loginAsTeacher() {
    const name = document.getElementById('teacher-name').value.trim();
    if (!name) {
        alert('선생님 이름을 입력해주세요.');
        return;
    }

    try {
        // 같은 이름이면 기존 교실을 재사용한다. (재로그인해도 학생이 유지되도록)
        const { ok, data } = await api.loginTeacher(name);
        if (!ok) {
            alert((data && data.error) || '로그인에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
            return;
        }

        startTeacherSession({ id: data.id, name: data.name || name, classroomId: data.classroom_id });
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
        const { ok, data } = await api.loginStudent(name, classroomId);
        if (!ok) {
            alert((data && data.error) || '로그인에 실패했습니다. 교실 ID가 올바른지 확인해주세요.');
            return;
        }

        startStudentSession({ id: data.id, name: data.name || name, classroomId });
        showStudentPage();
    } catch (error) {
        console.error('학생 로그인 중 오류:', error);
        alert('서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해주세요.');
    }
}

function logout() {
    clearSession();
    history.pushState({ page: LOGIN_PAGE }, '', window.location.href);
    showLoginPage();

    ['teacher-name', 'student-name', 'classroom-id'].forEach((id) => {
        document.getElementById(id).value = '';
    });
}

// ===== 교실 ID 복사 =====
const COPY_FEEDBACK_MS = 2000;

async function copyClassroomId() {
    if (!session.classroomId) {
        alert('교실 ID가 없습니다.');
        return;
    }

    try {
        await navigator.clipboard.writeText(session.classroomId);

        // 복사됐다는 걸 버튼 자체로 잠깐 알려준다.
        const button = document.getElementById('copy-btn');
        const originalText = button.textContent;
        button.textContent = '복사됨!';
        button.style.backgroundColor = 'var(--success)';
        button.style.color = 'white';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
            button.style.color = '';
        }, COPY_FEEDBACK_MS);
    } catch (error) {
        console.error('복사 실패:', error);
        alert('복사 실패했습니다.');
    }
}
