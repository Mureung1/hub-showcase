// 학생 화면: 질문 목록, 답변 제출과 채점 피드백, 질문별 AI 튜터 대화.

const STUDENT_QUESTION_CARD_HTML = `
    <div class="q-eyebrow"></div>
    <h3 class="q-headline"></h3>
    <div class="q-graph"></div>
    <div class="form-group">
        <textarea class="form-textarea answer-input" placeholder="답변을 입력하세요..."></textarea>
    </div>
    <div class="button-container">
        <button class="btn btn-primary answer-submit">제출</button>
    </div>
    <div class="feedback"></div>

    <button class="btn btn-secondary chat-toggle">AI 선생님과 대화하기</button>
    <div class="chat-panel">
        <div class="chat-messages"></div>
        <div class="chat-input-row">
            <textarea class="form-textarea chat-input" placeholder="궁금한 점을 물어보세요..." rows="2"></textarea>
            <button class="btn btn-primary chat-send">전송</button>
        </div>
    </div>`;

const CHAT_GREETING = '안녕하세요! 이 문제에 대해 궁금한 점을 물어보세요. 함께 생각해봐요.';

async function loadStudentQuestions() {
    if (!session.classroomId) return;

    try {
        const { data: questions } = await api.getQuestions(session.classroomId);
        const container = document.getElementById('questions-container');
        container.innerHTML = '';

        if (!Array.isArray(questions) || !questions.length) {
            container.innerHTML = '<p class="text-secondary">아직 질문이 없습니다.</p>';
            return;
        }

        questions.forEach((question, index) => {
            container.appendChild(createStudentQuestionCard(question, index + 1));
        });
    } catch (error) {
        console.error('질문 로드 실패:', error);
    }
}

function createStudentQuestionCard(question, number) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = STUDENT_QUESTION_CARD_HTML;

    // 과목·단원이 있으면 "질문 N · 과목 · 단원" 형태로 보여준다.
    const tag = [question.subject, question.unit].filter(Boolean).join(' · ');
    card.querySelector('.q-eyebrow').textContent = tag ? `질문 ${number} · ${tag}` : `질문 ${number}`;
    card.querySelector('.q-headline').textContent = question.text; // 교사 입력 → textContent
    renderQuestionGraph(card.querySelector('.q-graph'), question.graph);

    setupAnswerForm(card, question.id);
    setupChatPanel(card, question.id);
    return card;
}

// ===== 답변 제출 =====
function setupAnswerForm(card, questionId) {
    const answerInput = card.querySelector('.answer-input');
    const submitButton = card.querySelector('.answer-submit');
    const feedbackEl = card.querySelector('.feedback');

    submitButton.addEventListener('click', async () => {
        const answerText = answerInput.value.trim();
        if (!answerText) {
            alert('답변을 입력해주세요.');
            return;
        }

        // CPU 추론이라 수 초 걸린다. 기다리는 동안 화면이 죽은 것처럼 보이면 안 된다.
        submitButton.disabled = true;
        submitButton.textContent = '채점 중...';
        feedbackEl.className = 'feedback loading';
        feedbackEl.textContent = 'AI 선생님이 답변을 확인하고 있어요...';

        try {
            const { ok, data } = await api.submitAnswer(session.id, questionId, answerText);
            if (!ok) {
                showAnswerError(feedbackEl, (data && data.error) || '채점에 실패했습니다. 다시 시도해주세요.');
                return;
            }
            renderFeedback(feedbackEl, data.is_correct, data.feedback);
        } catch (error) {
            console.error('답변 제출 실패:', error);
            showAnswerError(feedbackEl, '서버에 연결하지 못했습니다.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '제출';
        }
    });
}

function showAnswerError(container, message) {
    container.className = 'feedback error';
    container.textContent = message;
}

function renderFeedback(container, isCorrect, feedback) {
    container.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    container.innerHTML = '';

    const badge = document.createElement('span');
    badge.className = isCorrect ? 'badge badge-success' : 'badge badge-warning';
    badge.textContent = isCorrect ? '정답' : '다시 생각해보기';

    const text = document.createElement('p');
    text.className = 'feedback-text';
    text.textContent = feedback; // LLM 출력이므로 innerHTML 금지

    container.append(badge, text);
}

// ===== 대화형 학습 (질문별 채팅) =====
function setupChatPanel(card, questionId) {
    const toggleButton = card.querySelector('.chat-toggle');
    const panel = card.querySelector('.chat-panel');
    const messagesEl = card.querySelector('.chat-messages');
    const chatInput = card.querySelector('.chat-input');
    const sendButton = card.querySelector('.chat-send');

    let historyLoaded = false;

    toggleButton.addEventListener('click', async () => {
        const opened = panel.classList.toggle('open');
        if (!opened || historyLoaded) return;

        // 처음 열 때만 기존 대화를 불러온다.
        historyLoaded = true;
        try {
            const { data: history } = await api.getChatMessages(session.id, questionId);
            if (Array.isArray(history) && history.length) {
                history.forEach((message) => appendBubble(messagesEl, message.role, message.content));
            } else {
                appendBubble(messagesEl, 'assistant', CHAT_GREETING);
            }
        } catch (error) {
            console.error('대화 기록 로드 실패:', error);
        }
    });

    sendButton.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendBubble(messagesEl, 'user', text);
        chatInput.value = '';

        // CPU 추론이라 수 초 걸린다. 대기 상태를 명확히 보여준다.
        sendButton.disabled = true;
        sendButton.textContent = '...';
        const pendingBubble = appendBubble(messagesEl, 'assistant', 'AI 선생님이 생각하고 있어요...');
        pendingBubble.classList.add('pending');

        try {
            const { ok, data } = await api.sendChatMessage(session.id, questionId, text);
            pendingBubble.remove();

            if (!ok) {
                appendErrorBubble(messagesEl, (data && data.error) || 'AI 응답에 실패했습니다.');
                return;
            }
            appendBubble(messagesEl, 'assistant', data.reply);
        } catch (error) {
            console.error('대화 전송 실패:', error);
            pendingBubble.remove();
            appendErrorBubble(messagesEl, '서버에 연결하지 못했습니다.');
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = '전송';
        }
    });
}

function appendBubble(container, role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${role === 'user' ? 'user' : 'assistant'}`;
    bubble.textContent = text; // LLM·사용자 입력이므로 innerHTML 금지
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function appendErrorBubble(container, message) {
    const bubble = appendBubble(container, 'assistant', message);
    bubble.classList.add('chat-error');
    return bubble;
}
