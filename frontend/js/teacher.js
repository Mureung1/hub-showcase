// 선생님 화면: 대시보드, 질문(평가) 관리, 학생 관리.

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

// ===== 공통 조각 =====

// 진행률 구간별 색상 클래스. DESIGN.md 의 색상 매핑과 같다.
function progressLevel(progress) {
    if (progress >= 90) return 'success';
    if (progress >= 70) return 'info';
    if (progress >= 50) return 'warning';
    return 'error';
}

// 선생님·학생이 입력한 값이 들어가므로 항상 textContent 로 채운다.
function createCell(text, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
}

function createProgressCell(progress) {
    const cell = document.createElement('td');
    const bar = document.createElement('div');
    bar.className = 'progress-bar';

    const fill = document.createElement('div');
    fill.className = `progress-fill ${progressLevel(progress)}`;
    fill.style.width = `${progress}%`;

    bar.appendChild(fill);
    cell.appendChild(bar);
    return cell;
}

function fillOptions(select, values) {
    select.innerHTML = '';
    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

// ===== 대시보드 탭 =====
async function loadTeacherDashboard() {
    if (!session.classroomId) return;

    try {
        const { ok, data } = await api.getDashboard(session.classroomId);
        if (!ok || !data) {
            console.error('대시보드 로드 실패: 서버가 데이터를 주지 않았습니다.');
            return;
        }

        document.getElementById('teacher-title').textContent = session.name;
        document.getElementById('classroom-name').textContent = data.classroom.name;
        document.getElementById('classroom-id-display').textContent = session.classroomId;

        const { total_students, average_progress, total_correct, total_answers } = data.stats;
        document.getElementById('stat-students').textContent = total_students;
        document.getElementById('stat-progress').textContent = `${average_progress}%`;
        document.getElementById('stat-correct').textContent = `${total_correct}/${total_answers}`;

        const tbody = document.querySelector('#students-table tbody');
        tbody.innerHTML = '';
        data.students.forEach((student) => {
            const row = document.createElement('tr');
            row.append(
                createCell(student.name),
                createProgressCell(student.progress),
                createCell(`${student.progress}%`, 'text-center')
            );
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('대시보드 로드 실패:', error);
    }
}

// ===== 평가 관리 탭 =====
async function loadQuestionsList() {
    if (!session.classroomId) return;

    try {
        const { data: questions } = await api.getQuestions(session.classroomId);
        const container = document.getElementById('questions-list');
        container.innerHTML = '';

        if (!Array.isArray(questions) || !questions.length) {
            container.innerHTML = '<p class="text-secondary">등록된 질문이 없습니다.</p>';
            return;
        }

        questions.forEach((question, index) => {
            container.appendChild(createQuestionCard(question, index + 1));
        });
    } catch (error) {
        console.error('질문 목록 로드 실패:', error);
    }
}

function createQuestionCard(question, number) {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = `질문 ${number}`;

    // 과목·단원이 지정돼 있으면 제목 옆에 배지로 표시한다.
    if (question.subject) {
        const badge = document.createElement('span');
        badge.className = 'subject-badge';
        badge.textContent = question.unit ? `${question.subject} · ${question.unit}` : question.subject;
        title.appendChild(badge);
    }

    const text = document.createElement('div');
    text.className = 'card-text';
    text.textContent = question.text; // 교사 입력이므로 innerHTML 금지

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger card-delete';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => removeQuestion(question.id, number));

    card.append(title, text);
    renderQuestionGraph(card, question.graph); // 그래프가 있으면 표시
    card.append(deleteButton);
    return card;
}

async function promptAddQuestion() {
    if (!session.classroomId) return;

    // 과목·단원을 고르고 질문 내용을 입력받는다. 취소하면 null.
    const question = await showQuestionForm();
    if (!question) return;

    try {
        const { ok } = await api.createQuestion({ ...question, classroom_id: session.classroomId });
        if (!ok) {
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

async function removeQuestion(questionId, number) {
    const confirmed = await showConfirm(
        `질문 ${number}을(를) 삭제할까요?\n학생들의 관련 답변·대화 기록도 함께 삭제됩니다.`
    );
    if (!confirmed) return;

    try {
        const { ok } = await api.deleteQuestion(questionId);
        if (!ok) {
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

// ===== 질문 생성 폼 (모달) =====
const QUESTION_FORM_HTML = `
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

/**
 * 질문 생성 폼 모달을 띄운다.
 * 추가하면 {subject, unit, text, graph} 로, 취소하면 null 로 resolve 된다.
 */
function showQuestionForm() {
    let form = null;

    return openModal({
        content: QUESTION_FORM_HTML,
        dismissResult: null,
        onOpen: (overlay) => { form = createQuestionForm(overlay); },
        onAction: (action, close) => {
            if (action === 'cancel') return close(null);
            if (action === 'recommend') return form.loadRecommendations();
            if (action === 'ok') {
                const question = form.read();
                if (!question.text) {
                    showToast('질문 내용을 입력해주세요.', 'error');
                    return;
                }
                close(question);
            }
        }
    });
}

/**
 * 질문 폼의 동작(과목/단원 연동, 그래프 첨부, AI 추천)을 붙이고
 * 바깥에서 쓸 수 있는 조작 창구를 돌려준다.
 */
function createQuestionForm(overlay) {
    const subjectSelect = overlay.querySelector('#q-subject');
    const unitSelect = overlay.querySelector('#q-unit');
    const textInput = overlay.querySelector('#q-text');
    const attachedGraphEl = overlay.querySelector('#q-graph-attached');
    const suggestionsEl = overlay.querySelector('#q-suggestions');
    const recommendButton = overlay.querySelector('[data-action="recommend"]');

    // 문제와 함께 저장될 함수식 목록. 학생 화면에도 같은 그래프가 그려진다.
    let selectedGraph = [];

    // 과목을 고르면 그 과목의 단원 목록으로 아래 드롭다운을 다시 채운다.
    const fillUnits = () => fillOptions(unitSelect, MATH_CURRICULUM[subjectSelect.value] || []);
    fillOptions(subjectSelect, Object.keys(MATH_CURRICULUM));
    fillUnits();
    subjectSelect.addEventListener('change', fillUnits);
    subjectSelect.focus();

    function attachGraph(graph) {
        selectedGraph = normalizeGraphData(graph);
        attachedGraphEl.innerHTML = '';
        if (!selectedGraph.length) return;

        const box = createGraphBox(selectedGraph);
        if (!box) {
            selectedGraph = []; // 그릴 수 없는 식이면 첨부하지 않는다
            return;
        }

        const caption = document.createElement('div');
        caption.className = 'q-graph-caption';
        caption.append('이 그래프가 문제와 함께 저장됩니다.');

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'q-graph-remove';
        removeButton.textContent = '그래프 제거';
        removeButton.addEventListener('click', () => attachGraph([]));
        caption.appendChild(removeButton);

        attachedGraphEl.append(box, caption);
    }

    function showSuggestionHint(text, isError = false) {
        suggestionsEl.innerHTML = '';
        const hint = document.createElement('p');
        hint.className = `q-suggestions-hint${isError ? ' error' : ''}`;
        hint.textContent = text;
        suggestionsEl.appendChild(hint);
    }

    // 후보를 누르면 질문 내용에 채워지고, 그래프가 있으면 함께 첨부된다. (모달은 닫지 않는다)
    function renderSuggestions(questions) {
        showSuggestionHint('추천 문제를 눌러 위 칸에 채워 넣으세요.');

        questions.forEach((question) => {
            // 보통 {text, graph} 객체지만, 구식 문자열 응답도 관대하게 처리한다.
            const text = typeof question === 'string' ? question : (question && question.text) || '';
            if (!text) return;
            const graph = typeof question === 'string' ? [] : (question && question.graph) || [];

            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'q-suggestion';

            const label = document.createElement('span');
            label.className = 'q-suggestion-text';
            label.textContent = text; // LLM 출력 → textContent
            item.appendChild(label);

            renderQuestionGraph(item, graph); // 그래프가 있으면 미리보기
            item.addEventListener('click', () => {
                textInput.value = text;
                attachGraph(graph);
            });
            suggestionsEl.appendChild(item);
        });
    }

    async function loadRecommendations() {
        const originalLabel = recommendButton.textContent;
        recommendButton.disabled = true;
        recommendButton.textContent = '추천 받는 중...';
        showSuggestionHint('AI가 문제를 만들고 있어요... (수 초 걸릴 수 있어요)');

        try {
            const { ok, status, data } = await api.recommendQuestions(subjectSelect.value, unitSelect.value);

            if (!ok) {
                if (status === 404) {
                    showSuggestionHint('추천 기능을 찾지 못했습니다. 백엔드 서버를 재시작했는지 확인해주세요.', true);
                } else {
                    showSuggestionHint((data && data.error) || `AI 추천에 실패했습니다. (HTTP ${status})`, true);
                }
                return;
            }
            if (!data || !Array.isArray(data.questions)) {
                showSuggestionHint('AI 추천 응답을 읽지 못했습니다. 다시 시도해주세요.', true);
                return;
            }

            renderSuggestions(data.questions);
        } catch (error) {
            console.error('AI 추천 실패:', error);
            showSuggestionHint('서버에 연결하지 못했습니다.', true);
        } finally {
            recommendButton.disabled = false;
            recommendButton.textContent = originalLabel;
        }
    }

    return {
        read: () => ({
            subject: subjectSelect.value,
            unit: unitSelect.value,
            text: textInput.value.trim(),
            graph: selectedGraph
        }),
        loadRecommendations
    };
}

// ===== 학생 관리 탭 =====
async function loadStudentsList() {
    if (!session.classroomId) return;

    try {
        const { data: students } = await api.getStudents(session.classroomId);
        const tbody = document.querySelector('#all-students-table tbody');
        tbody.innerHTML = '';

        if (!Array.isArray(students) || !students.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-secondary">등록된 학생이 없습니다.</td></tr>';
            return;
        }

        students.forEach((student) => {
            const row = document.createElement('tr');
            row.append(
                createCell(student.name),
                createCell(`${student.progress}%`),
                createCell(`${student.correct}/${student.total}`),
                createStudentActionCell(student)
            );
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
    }
}

function createStudentActionCell(student) {
    const cell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => removeStudent(student.id, student.name));
    cell.appendChild(deleteButton);
    return cell;
}

async function promptAddStudent() {
    if (!session.classroomId) return;

    const studentName = prompt('학생 이름을 입력하세요:');
    if (!studentName) return;

    try {
        const { data: student } = await api.createStudent(studentName, session.classroomId);
        await api.joinClassroom(session.classroomId, student.id);
        await loadTeacherDashboard();
    } catch (error) {
        console.error('학생 추가 실패:', error);
    }
}

async function removeStudent(studentId, studentName) {
    const confirmed = await showConfirm(`${studentName} 학생을 삭제할까요?\n답변·대화 기록도 함께 삭제됩니다.`);
    if (!confirmed) return;

    try {
        const { ok } = await api.deleteStudent(studentId);
        if (!ok) {
            showToast('학생 삭제에 실패했습니다.', 'error');
            return;
        }
        await loadStudentsList();
        // 대시보드 통계도 최신화 (전체 학생 수 등)
        if (isTabActive('dashboard')) {
            await loadTeacherDashboard();
        }
        showToast('학생이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('학생 삭제 실패:', error);
        showToast('서버에 연결하지 못했습니다.', 'error');
    }
}
