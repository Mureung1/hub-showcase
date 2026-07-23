// 현재 로그인한 사용자. 새로고침하면 사라진다(MVP 라 브라우저에 저장하지 않는다).

const session = {
    type: null,        // 'teacher' | 'student'
    id: null,
    name: null,
    classroomId: null
};

function startTeacherSession({ id, name, classroomId }) {
    Object.assign(session, { type: 'teacher', id, name, classroomId });
}

function startStudentSession({ id, name, classroomId }) {
    Object.assign(session, { type: 'student', id, name, classroomId });
}

function clearSession() {
    Object.assign(session, { type: null, id: null, name: null, classroomId: null });
}
