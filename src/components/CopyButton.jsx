import { useState } from 'react';

function ClipboardIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

// CommandDetailPage.jsx에서 분리 — "복사된 상태"는 이 버튼 자기 자신만 알면 되는 정보라
// (부모가 어떤 명령어가 복사됐는지 알 필요가 없음) state를 내부에 완전히 가둬둘 수 있다.
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // 클립보드 접근 실패 시 조용히 무시 (권한 없는 환경 등)
        }
    };

    return (
        <button
            type="button"
            className={`copy-button${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            aria-label={`${text} 명령어 복사`}
        >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
    );
}

export default CopyButton;
