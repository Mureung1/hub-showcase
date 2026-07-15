// Bridge 컴포넌트 따라치기 연습 (Toast -> Envelope -> FeedbackModal 순)
// 실제로는 파일 하나에 컴포넌트 하나인데 그냥 공부용이라 몰아서 적음

// ---- 1) Toast.jsx : 알림 잠깐 떴다 사라지는 거 ----

import { useAppState } from '../state/useAppState'
import styles from './Toast.module.css'   // css module, styles.toast 이런식으로 씀

export default function Toast() {
    const { state } = useAppState()   // 여긴 값만 읽으면 돼서 state만 꺼냄

    // 알림 내용 없으면 그냥 아무것도 안그리고 끝냄. ! 는 아니다 라는 뜻
    if (!state.toast) return null

    return (
        <div className={styles.toast}>
            {/* 클래스 두개 합칠때 백틱 써야됨. 처음에 따옴표 써서 안됐었음 */}
            <span className={`msymf ${styles.icon}`}>check_circle</span>
            {state.toast}   {/* 중괄호 안에 넣으면 그 값이 글자로 나옴 */}
        </div>
    )
}


// ---- 2) Envelope.jsx : 봉투 그림. send/sent/recommend 세군데서 재사용함 ----
// props 연습하기 딱 좋음. 딴 파일 안불러와서 혼자 이해됨

import styles from './Envelope.module.css'

// 봉투 색깔 3종류 미리 정해둔거
const VARIANTS = {
    basic: { bg: 'var(--color-paper-white)', stroke: 'var(--color-primary-teal)', seal: 'var(--color-accent-terracotta)' },
    lined: { bg: 'var(--color-cream)', stroke: 'var(--color-cool-gray)', seal: 'var(--color-primary-teal)' },
    wax: { bg: 'var(--color-paper-white)', stroke: 'var(--color-accent-terracotta)', seal: 'var(--color-accent-terracotta)', dash: '5 3' },
}

// props를 {}로 풀어서 받음. = 뒤에꺼는 안넘겨줬을때 기본값
export default function Envelope({
    variant = 'basic',
    selected = false,
    floating = false,
    pulsing = false,
    onClick,
    width = 190,
    height = 130,
    label,
}) {
    const v = VARIANTS[variant]   // variant 값에 맞는 색 꺼냄

    // 클래스 조립하는 부분. selected && ... 는 selected 참일때만 클래스 들어감
    // filter(Boolean)로 false 걸러내고 join으로 한줄로 합침
    const classes = [
        styles.envelope,
        selected && styles.selected,
        floating && styles.floating,
        pulsing && styles.pulsing,
        onClick && styles.clickable,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <button
            type="button"
            className={classes}
            style={{ width, height }}
            onClick={onClick}   // 클릭하면 뭐할지는 부모가 정해서 넘겨줌
            aria-pressed={onClick ? selected : undefined}
            aria-label={label}
        >
            {/* 밑에 svg는 봉투모양 그리는거. width/height로 좌표 계산함. 일단 넘어감 */}
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
                <rect
                    x="4"
                    y="4"
                    width={width - 8}
                    height={height - 8}
                    rx="4"
                    style={{
                        fill: v.bg,
                        stroke: selected ? 'var(--color-primary-teal)' : v.stroke,   // 삼항연산자
                        strokeWidth: 2,
                        strokeDasharray: v.dash,
                    }}
                />
                <path
                    d={`M4 4 L${width / 2} ${height / 2} L${width - 4} 4`}
                    style={{ fill: 'none', stroke: v.stroke, strokeWidth: 2 }}
                />
                {/* variant가 lined일때만 선 하나 더 그림 (조건부 렌더링) */}
                {variant === 'lined' && (
                    <path
                        d={`M4 ${height - 4} L${width / 2} ${height / 2 + 10} L${width - 4} ${height - 4}`}
                        style={{ fill: 'none', stroke: v.stroke, strokeWidth: 1.5 }}
                    />
                )}
                <circle cx={width / 2} cy={height / 2} r="12" style={{ fill: v.seal }} />
            </svg>
        </button>
    )
}


// ---- 3) FeedbackModal.jsx : 추천 건너뛸때 이유 물어보는 팝업 ----
// 배열 map으로 버튼 만들기 + input 다루기(제어 컴포넌트) 연습

import { useAppState } from '../../state/useAppState'
import styles from './modal.module.css'

// 버튼으로 뿌릴 이유 목록
const REASONS = ['주제가 안 맞았어요', '이미 아는 이야기', '마음이 가지 않았어요']

export default function FeedbackModal() {
    const { state, actions } = useAppState()   // state는 읽는거, actions는 바꾸는 함수들

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
                <div className={`${styles.iconCircle} ${styles.iconCircleTeal}`}>
                    <span className="msym">tune</span>
                </div>
                <h2 className={styles.title}>잠깐, 짧은 의견을 들려주세요</h2>
                <p className={styles.desc}>다음 추천 품질을 개선하는 데 쓰일게요.</p>

                <div className={styles.chips}>
                    {/* 배열을 map 돌려서 버튼 3개 만듦. key는 항목 구분용이라 꼭 넣어야됨 */}
                    {REASONS.map((reason) => (
                        <button
                            key={reason}
                            type="button"
                            // 지금 고른거랑 같으면 chipActive 붙여서 강조
                            className={`${styles.chip} ${state.feedback === reason ? styles.chipActive : ''}`}
                            // () => 로 감싸야 클릭할때 실행됨. 안감싸면 바로 실행돼버림 (실수했던부분)
                            onClick={() => actions.setFeedback(reason)}
                        >
                            {reason}
                        </button>
                    ))}
                </div>

                {/* 제어 컴포넌트: value는 state에서 가져오고 칠때마다 onChange로 state 갱신 */}
                <textarea
                    className={styles.textarea}
                    placeholder="더 하고 싶은 말이 있다면 적어주세요 (선택)"
                    value={state.feedback && !REASONS.includes(state.feedback) ? state.feedback : ''}
                    onChange={(e) => actions.setFeedback(e.target.value)}
                />

                <div className={styles.actions}>
                    <button type="button" className={styles.btnOutline} onClick={actions.closeFeedback}>
                        건너뛰기
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={actions.sendFeedback}>
                        보내기
                    </button>
                </div>
            </div>
        </div>
    )
}
