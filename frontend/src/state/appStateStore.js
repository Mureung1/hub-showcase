import { createContext } from 'react'
import { WAIT_SECS_INITIAL } from '../lib/format'

// 프로토타입 초기 state (extracted-source.md §4). `screen`은 라우트가 대신한다.
export const initialState = {
  letter: '',
  title: '',
  envelope: null,
  showConfirm: false,
  showArrived: false,
  phase: 'idle', // 'idle' | 'waiting' | 'arrived'
  opened: false,
  replying: false,
  toast: '',
  tab: 'mine', // 'mine' | 'linked'
  waitSecs: WAIT_SECS_INITIAL,
  showFeedback: false,
  feedback: '',
  currentLetterId: null, // 방금 보낸 편지의 id — 추천 조회/생성 API에 쓴다
  recommendation: null, // 백엔드가 준 추천 응답 {has_match, match_id, matched_letter, reason, ...} 또는 {has_match:false, reason_code}
  replyTargetMatchId: null, // 지금 답장 중인 matchId — 추천 편지에 대한 첫 답장(스레드 시작)일 때만 채워진다
  replyTargetLetterId: null, // 지금 답장 중인 letterId — 이미 시작된 스레드에 이어 답장할 때 채워진다(matchId와 배타적)
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.value }
    case 'SET_LETTER':
      return { ...state, letter: action.value }
    case 'SET_ENVELOPE':
      return { ...state, envelope: action.value }
    case 'SHOW_CONFIRM':
      return { ...state, showConfirm: true }
    case 'HIDE_CONFIRM':
      return { ...state, showConfirm: false }
    case 'SHOW_ARRIVED':
      return { ...state, showArrived: true }
    case 'START_WAITING':
      // 발송 완료: 작성 중이던 편지를 비우고 24h 대기 클럭을 시작한다
      return {
        ...state,
        showArrived: false,
        phase: 'waiting',
        waitSecs: WAIT_SECS_INITIAL,
        letter: '',
        title: '',
        envelope: null,
      }
    case 'TICK': {
      // 실제 "도착" 판정은 서버가 하고(폴링), 이 카운트다운은 화면 표시용일 뿐이라 0에서 멈춘다.
      if (state.phase !== 'waiting') return state
      return { ...state, waitSecs: Math.max(0, state.waitSecs - 1) }
    }
    case 'SET_CURRENT_LETTER_ID':
      return { ...state, currentLetterId: action.value }
    case 'RECOMMENDATION_ARRIVED':
      // 폴링/조회 결과가 "확정된" 상태(추천 있음, 위기, 후보없음)일 때만 이 액션이 온다.
      return { ...state, phase: 'arrived', recommendation: action.value }
    case 'RESET_RECOMMEND':
      return { ...state, opened: false }
    case 'UNFOLD':
      return { ...state, opened: true }
    // 로그인 직후/새로고침 시 서버에 아직 미해결(recommended/opened) 매칭이 남아있으면
    // 이 액션으로 복원한다 — 봉투 unfold 애니메이션 없이 곧장 열린 상태로 보여준다.
    case 'RESTORE_PENDING_MATCH':
      return { ...state, phase: 'arrived', opened: true, recommendation: action.value }
    // 로그인 직후/새로고침 시 아직 24h 대기 중인 편지가 남아있으면 이 액션으로 복원한다 —
    // waitSecs는 서버의 실제 경과 시간으로 계산된 값이라 화면표시용 카운트다운이 정확해진다.
    case 'RESTORE_WAITING':
      return { ...state, phase: 'waiting', currentLetterId: action.currentLetterId, waitSecs: action.waitSecs }
    case 'START_REPLY':
      return { ...state, replying: true, opened: false, replyTargetMatchId: action.matchId, replyTargetLetterId: null }
    // 이미 시작된 스레드(이어진 편지)에 이어 답장할 때 — /main의 답장 모드를 그대로 재사용한다.
    case 'START_REPLY_THREAD':
      return { ...state, replying: true, opened: false, replyTargetMatchId: null, replyTargetLetterId: action.letterId }
    case 'CANCEL_REPLY':
      return { ...state, replying: false, replyTargetMatchId: null, replyTargetLetterId: null }
    case 'SHOW_FEEDBACK':
      return { ...state, showFeedback: true }
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.value }
    case 'SET_TAB':
      return { ...state, tab: action.value }
    case 'SET_TOAST':
      return { ...state, toast: action.value }
    case 'RESET_AFTER_SEND':
      // 새 편지 발송 완료 후 작성 화면 초기화 (답장/피드백 완료 포함)
      return {
        ...state,
        letter: '',
        title: '',
        envelope: null,
        replying: false,
        showFeedback: false,
        feedback: '',
        phase: 'idle',
        waitSecs: WAIT_SECS_INITIAL,
        currentLetterId: null,
        recommendation: null,
        replyTargetMatchId: null,
        replyTargetLetterId: null,
      }
    default:
      return state
  }
}

export const AppStateContext = createContext(null)

export const TOAST_DURATION_MS = 2500
