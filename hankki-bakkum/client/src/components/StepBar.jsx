import { STATUS, STEPS, DONE_COUNT } from "../lib/status";
import "./StepBar.css";

/**
 * 진행 스텝바 — 요청등록 → 매칭 → 완료대기 → 완료·지급 (4단계 고정)
 * 디자인 규칙(hankki-design 5절):
 *  - 완료한 단계 = --primary
 *  - 현재 단계  = --hot 테두리
 *  - 최종 지급  = --ok
 * 상태값이 채팅을 대체한다 — 거래 화면에는 항상 이 컴포넌트가 보인다.
 */
export default function StepBar({ status }) {
    const doneCount = DONE_COUNT[status] ?? 0;
    const isPaid = status === STATUS.DONE;

    return (
        <ol className="stepbar" aria-label="거래 진행 단계">
            {STEPS.map((label, i) => {
                const isLast = i === STEPS.length - 1;
                let cls = "step";
                if (isPaid && isLast) cls += " step--paid"; // 완료·지급 = ok(초록)
                else if (i < doneCount) cls += " step--done"; // 지나온 단계 = primary
                else if (i === doneCount) cls += " step--current"; // 현재 단계 = hot 테두리
                return (
                    <li key={label} className={cls}>
                        <span className="step__dot">{i + 1}</span>
                        <span className="step__label">{label}</span>
                        {!isLast && <span className="step__bar" aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
}