// 화면 어디서나 쓰는 공통 UI 조각: 토스트 알림과 오버레이 모달.
// 네이티브 alert/confirm 은 화면을 막고 디자인과 겉돌아서, 인페이지 UI로 대체한다.

const MODAL_CLOSE_MS = 180; // 닫힘 애니메이션이 끝난 뒤 DOM 에서 제거
const TOAST_VISIBLE_MS = 2600;
const TOAST_FADE_MS = 250;

/**
 * 오버레이 모달을 띄우고, 닫힐 때의 결과값으로 resolve 되는 Promise 를 돌려준다.
 * ESC 와 바깥 클릭은 dismissResult 로 닫는다.
 *
 * @param {object} config
 * @param {string} config.content     모달 내부 HTML (data-action 버튼을 넣어 둔다)
 * @param {*}      config.dismissResult  ESC·바깥 클릭으로 닫혔을 때의 결과값
 * @param {(action: string, close: (result: *) => void) => void} config.onAction
 *        data-action 버튼이 눌렸을 때 호출된다.
 * @param {(overlay: HTMLElement) => void} [config.onOpen]
 *        모달이 DOM 에 붙은 직후 호출된다. 내부 요소를 채우거나 포커스를 줄 때 쓴다.
 */
function openModal({ content, dismissResult, onAction, onOpen }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = content;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const close = (result) => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), MODAL_CLOSE_MS);
            document.removeEventListener('keydown', handleKeydown);
            resolve(result);
        };

        function handleKeydown(event) {
            if (event.key === 'Escape') close(dismissResult);
        }
        document.addEventListener('keydown', handleKeydown);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) return close(dismissResult); // 바깥 클릭 = 취소
            const action = event.target.dataset.action;
            if (action) onAction(action, close);
        });

        if (onOpen) onOpen(overlay);
    });
}

/**
 * 삭제처럼 되돌릴 수 없는 동작을 확인받는다. 확인하면 true, 취소하면 false.
 */
function showConfirm(message) {
    return openModal({
        content: `
            <div class="modal" role="dialog" aria-modal="true">
                <p class="modal-message"></p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="cancel">취소</button>
                    <button class="btn btn-danger-solid" data-action="ok">삭제</button>
                </div>
            </div>`,
        dismissResult: false,
        onOpen: (overlay) => {
            // 학생 이름 등 사용자 입력이 섞이므로 textContent 로 넣는다.
            overlay.querySelector('.modal-message').textContent = message;
        },
        onAction: (action, close) => {
            if (action === 'ok') close(true);
            else if (action === 'cancel') close(false);
        }
    });
}

/**
 * 화면 아래쪽에 잠깐 떴다 사라지는 알림.
 * @param {'info'|'success'|'error'} [type]
 */
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
        setTimeout(() => toast.remove(), TOAST_FADE_MS);
    }, TOAST_VISIBLE_MS);
}
