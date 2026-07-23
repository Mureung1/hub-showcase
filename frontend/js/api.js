// 백엔드 API 호출을 한곳에 모은다. 화면 코드는 URL 이나 필드 이름을 몰라도 되고,
// 응답은 항상 { ok, status, data } 형태로 돌려받는다.
//
// - ok: HTTP 상태가 2xx 인지
// - data: 응답 본문(JSON). 본문이 없거나 JSON 이 아니면 null
// - 서버에 닿지 못하면(네트워크 오류) 예외를 던진다. 호출부가 try/catch 로 구분한다.

const API_BASE = 'http://localhost:5000/api';

async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
}

const api = {
    // 로그인
    loginTeacher: (name) =>
        request('/teacher/login', { method: 'POST', body: { name } }),
    loginStudent: (name, classroomId) =>
        request('/student/login', { method: 'POST', body: { name, classroom_id: classroomId } }),

    // 교실
    getDashboard: (classroomId) =>
        request(`/classroom/${classroomId}/dashboard`),
    getQuestions: (classroomId) =>
        request(`/classroom/${classroomId}/questions`),
    getStudents: (classroomId) =>
        request(`/classroom/${classroomId}/students`),

    // 학생 관리
    createStudent: (name, classroomId) =>
        request('/student/create', { method: 'POST', body: { name, classroom_id: classroomId } }),
    joinClassroom: (classroomId, studentId) =>
        request(`/classroom/${classroomId}/add-student`, { method: 'POST', body: { student_id: studentId } }),
    deleteStudent: (studentId) =>
        request(`/student/${studentId}`, { method: 'DELETE' }),

    // 질문 관리
    createQuestion: (question) =>
        request('/question/create', { method: 'POST', body: question }),
    deleteQuestion: (questionId) =>
        request(`/question/${questionId}`, { method: 'DELETE' }),
    recommendQuestions: (subject, unit) =>
        request('/question/recommend', { method: 'POST', body: { subject, unit } }),

    // 답변 · 대화
    submitAnswer: (studentId, questionId, answerText) =>
        request('/answer/submit', {
            method: 'POST',
            body: { question_id: questionId, student_id: studentId, answer_text: answerText }
        }),
    getChatMessages: (studentId, questionId) =>
        request(`/student/${studentId}/question/${questionId}/messages`),
    sendChatMessage: (studentId, questionId, message) =>
        request('/chat', {
            method: 'POST',
            body: { student_id: studentId, question_id: questionId, message }
        })
};
