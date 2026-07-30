import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createLetter,
  createRecommendation,
  fetchMyLetters,
  fetchMyMatches,
  refreshRecommendation as apiRefreshRecommendation,
  patchMatch,
  replyToMatch,
  replyToThreadLetter,
} from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { validateLetterContent, MIN_LETTER_LENGTH } from '../lib/validateLetter'
import { WAIT_SECS_INITIAL } from '../lib/format'
import { AppStateContext, TOAST_DURATION_MS, initialState, reducer } from './appStateStore'

// GET current 대신 POST(멱등)로 폴링한다 — 24h 전엔 DB 조회 한 번으로 바로 not_ready가
// 돌아와서 값싸고, 실제로 준비됐을 때는 이 호출이 곧 "생성 트리거"도 겸한다.
const RECOMMENDATION_POLL_MS = 30_000

// 백엔드가 has_match:false를 주더라도 "확정된 결과"로 취급해 대기 화면을 끝낼 사유들.
// not_ready만 "아직 더 기다려야 함"이라 폴링을 계속한다.
const TERMINAL_REASON_CODES = new Set(['support_needed', 'no_candidates', 'not_found', 'tagging_pending'])

// FeedbackModal의 사유 칩과 동일한 목록 — 프리셋 선택인지 직접 쓴 텍스트인지 구분하는 데 쓴다.
const FEEDBACK_REASONS = new Set(['주제가 안 맞았어요', '이미 아는 이야기', '마음이 가지 않았어요'])

// 아직 결정(답장/스쳐가기) 안 난 매칭 상태 — 새로고침 복원 대상.
const UNRESOLVED_MATCH_STATUSES = new Set(['recommended', 'opened'])

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const navigate = useNavigate()
  const toastTimer = useRef(null)
  const sending = useRef(false) // 전송 중 중복 클릭 방지

  // 로그인 상태 — Supabase 세션 기준. authLoading이 끝나기 전엔 아직 로그인 여부를
  // 모르는 상태이므로(새로고침 직후 등) 라우트 보호에서 섣불리 리다이렉트하지 않는다.
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const restoreChecked = useRef(false) // 로그인 1회당 미해결 추천 복원 확인은 한 번만

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null)
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  // 로그인 상태가 되는 시점(새로고침으로 세션 복원 포함)에 두 가지를 순서대로 확인한다.
  // 1) 미해결(recommended/opened) 매칭이 있으면 봉투 클릭 없이 곧장 추천 결정 화면을 복원.
  // 2) 없으면 24h 대기 중인 편지가 있는지 확인해서 대기 화면(폴링 포함)을 복원.
  // 새로고침하거나 사이트를 나갔다 들어와도 진행 중이던 화면이 그대로 유지되게 하기 위함.
  useEffect(() => {
    if (!user) {
      restoreChecked.current = false
      return
    }
    if (restoreChecked.current) return
    restoreChecked.current = true

    fetchMyMatches()
      .then((matches) => {
        const pending = matches.find((m) => UNRESOLVED_MATCH_STATUSES.has(m.status))
        if (pending) {
          dispatch({
            type: 'RESTORE_PENDING_MATCH',
            value: {
              has_match: true,
              match_id: pending.match_id,
              matched_letter: pending.matched_letter,
              reason: pending.reason,
            },
          })
          if (pending.status === 'recommended') {
            patchMatch(pending.match_id, 'opened').catch(() => {})
          }
          navigate('/recommend')
          return
        }

        // 미해결 매칭이 없다 — 24h 대기가 아직 안 끝난 편지가 있는지 확인한다.
        // 답장 편지(recipientId 있음)는 모음소행이 아니라 매칭 대상이 아니므로 제외한다
        // (countPoolLetters와 동일한 기준 — recipientId: null만 모음소 편지).
        return fetchMyLetters().then((letters) => {
          const latest = letters.find((l) => !l.recipientId) // createdAt desc라 첫 매치가 최신
          if (!latest) return

          return createRecommendation(latest.id).then((result) => {
            // 이 편지는 이미 답장했거나 스쳐 갔음(최종 결정 완료) — 복원할 게 없으니 그대로 둔다.
            // 여기서 걸러주지 않으면 아래 not_ready 분기로 빠져 이미 끝난 편지의 대기 화면을
            // 잘못 복원해버린다(실제로 겪은 버그: 답장 후 새로고침하면 새 추천이 계속 도착).
            if (result.reason_code === 'already_resolved') return
            if (result.has_match || TERMINAL_REASON_CODES.has(result.reason_code)) {
              dispatch({ type: 'RESTORE_PENDING_MATCH', value: result })
              navigate('/recommend')
              return
            }
            // not_ready — 아직 24h가 안 지났다. 경과 시간만큼 뺀 카운트다운으로 대기 화면 복원.
            const elapsedSecs = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 1000)
            dispatch({
              type: 'RESTORE_WAITING',
              currentLetterId: latest.id,
              waitSecs: Math.max(0, WAIT_SECS_INITIAL - elapsedSecs),
            })
            navigate('/sent')
          })
        })
      })
      .catch(() => {})
  }, [user, navigate])

  const showToast = useCallback((message) => {
    dispatch({ type: 'SET_TOAST', value: message })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => dispatch({ type: 'SET_TOAST', value: '' }), TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), [])

  // 대기 화면 24h 카운트다운 클럭 (화면 표시용 — 실제 도착 판정은 아래 폴링이 한다)
  useEffect(() => {
    if (state.phase !== 'waiting') return undefined
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.phase])

  // 추천이 실제로 준비됐는지 서버에 물어본다. has_match:true거나 확정된 사유(위기·후보없음
  // 등)면 대기를 끝내고 phase를 arrived로 바꾼다. not_ready면 조용히 계속 기다린다.
  const checkRecommendation = useCallback(async () => {
    if (!state.currentLetterId) return
    try {
      const result = await createRecommendation(state.currentLetterId)
      if (result.has_match || TERMINAL_REASON_CODES.has(result.reason_code)) {
        dispatch({ type: 'RECOMMENDATION_ARRIVED', value: result })
      }
    } catch {
      // 폴링 실패는 조용히 넘어간다 — 다음 폴링에서 다시 시도
    }
  }, [state.currentLetterId])

  // 대기 중일 때 주기적으로 추천 준비 여부를 확인한다.
  useEffect(() => {
    if (state.phase !== 'waiting' || !state.currentLetterId) return undefined
    checkRecommendation() // 화면 진입 시 한 번 즉시 확인
    const id = setInterval(checkRecommendation, RECOMMENDATION_POLL_MS)
    return () => clearInterval(id)
  }, [state.phase, state.currentLetterId, checkRecommendation])

  const actions = {
    // 회원가입: 이메일 인증이 켜져 있으면 세션이 바로 안 생길 수 있어 그 경우를 구분해 알려준다.
    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return { error: error.message }
      if (!data.session) return { needsEmailConfirm: true }
      navigate('/main')
      return {}
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      navigate('/main')
      return {}
    },
    signOut: async () => {
      await supabase.auth.signOut()
      navigate('/')
    },

    setTitle: (value) => dispatch({ type: 'SET_TITLE', value }),
    setLetter: (value) => dispatch({ type: 'SET_LETTER', value }),

    // main → 확인 모달 : 편지가 비어 있거나 너무 짧거나 너무 길면 토스트 경고만 띄우고 진행하지 않는다.
    // 봉투 선택 화면은 없앴으므로(배포 후 편지가 모이면 재도입 예정) 검증 통과 시 바로 확인 모달을 띄운다.
    toSend: () => {
      if (!validateLetterContent(state.letter)) {
        const trimmedLength = state.letter.trim().length
        const message =
          trimmedLength === 0
            ? '편지 내용을 먼저 적어주세요.'
            : trimmedLength < MIN_LETTER_LENGTH
              ? `편지 내용은 ${MIN_LETTER_LENGTH}자 이상 적어주세요.`
              : '편지가 너무 길어요.'
        showToast(message)
        return
      }
      dispatch({ type: 'SHOW_CONFIRM' })
    },

    cancelConfirm: () => dispatch({ type: 'HIDE_CONFIRM' }),
    reallySend: async () => {
      if (sending.current) return
      sending.current = true
      try {
        // 봉투 선택 화면 제거로 envelope은 'basic' 고정값 사용(백엔드 스키마가 필수 필드라 유지)
        const letter = await createLetter({ title: state.title, content: state.letter, envelope: 'basic' })
        dispatch({ type: 'SET_CURRENT_LETTER_ID', value: letter.id })
        dispatch({ type: 'HIDE_CONFIRM' })
        dispatch({ type: 'SHOW_ARRIVED' })
      } catch (err) {
        dispatch({ type: 'HIDE_CONFIRM' })
        showToast(err.message || '편지를 보내지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        sending.current = false
      }
    },
    closeArrived: () => {
      dispatch({ type: 'START_WAITING' })
      navigate('/sent')
    },

    // 데모용 "빨리감기" — 실제로 시간을 앞당기진 못하니, 지금 시점에 추천이 준비됐는지
    // 바로 한 번 확인만 해준다(24h 전이면 그대로 not_ready라 대기 화면 유지).
    checkRecommendationNow: () => checkRecommendation(),
    openRecommend: () => {
      dispatch({ type: 'RESET_RECOMMEND' })
      navigate('/recommend')
    },

    unfold: () => {
      dispatch({ type: 'UNFOLD' })
      if (state.recommendation?.has_match && state.recommendation.match_id) {
        patchMatch(state.recommendation.match_id, 'opened').catch(() => {})
      }
    },
    // RecommendPage(방금 받은 추천 또는 새로고침으로 복원된 추천)에서 첫 답장을 시작하는 경로.
    startReply: () => {
      dispatch({ type: 'START_REPLY', matchId: state.recommendation?.match_id ?? null })
      navigate('/main')
    },
    // 저장소 "이어진 편지"에서 스레드에 이어 답장할 때 — /main의 답장 모드를 그대로 재사용한다.
    startReplyToThread: (letterId) => {
      dispatch({ type: 'START_REPLY_THREAD', letterId })
      navigate('/main')
    },
    cancelReply: () => dispatch({ type: 'CANCEL_REPLY' }),
    sendReply: async () => {
      if (!validateLetterContent(state.letter)) {
        const trimmedLength = state.letter.trim().length
        const message =
          trimmedLength === 0
            ? '편지 내용을 먼저 적어주세요.'
            : trimmedLength < MIN_LETTER_LENGTH
              ? `편지 내용은 ${MIN_LETTER_LENGTH}자 이상 적어주세요.`
              : '편지가 너무 길어요.'
        showToast(message)
        return
      }
      if (sending.current) return
      sending.current = true
      // 스레드 답장 완료 후에는 해당 스레드 화면으로 돌아가 보여주기 위해 미리 읽어둔다
      // (RESET_AFTER_SEND가 replyTargetLetterId를 지워버리기 전에).
      const threadLetterId = state.replyTargetLetterId
      try {
        if (state.replyTargetMatchId) {
          await replyToMatch(state.replyTargetMatchId, { title: state.title, content: state.letter })
        } else {
          await replyToThreadLetter(threadLetterId, { title: state.title, content: state.letter })
        }
        showToast('답장을 보냈어요. 8시간 뒤 상대에게 전달돼요.')
        dispatch({ type: 'RESET_AFTER_SEND' })
        navigate(threadLetterId ? `/storage/linked/${threadLetterId}` : '/main')
      } catch (err) {
        showToast(err.message || '답장을 보내지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        sending.current = false
      }
    },

    // "다른 편지 보기" — 지금 추천을 dismiss하고 새로 하나 받아온다.
    refreshRecommendation: async () => {
      if (!state.currentLetterId) return
      try {
        const result = await apiRefreshRecommendation(state.currentLetterId)
        dispatch({ type: 'RECOMMENDATION_ARRIVED', value: result })
      } catch (err) {
        showToast(err.message || '다른 편지를 가져오지 못했어요.')
      }
    },

    passBy: () => {
      if (state.recommendation?.has_match && state.recommendation.match_id) {
        patchMatch(state.recommendation.match_id, 'dismissed').catch(() => {})
      }
      dispatch({ type: 'SHOW_FEEDBACK' })
    },
    setFeedback: (value) => dispatch({ type: 'SET_FEEDBACK', value }),
    closeFeedback: () => {
      dispatch({ type: 'RESET_AFTER_SEND' })
      navigate('/main')
    },
    sendFeedback: () => {
      const matchId = state.recommendation?.match_id
      const value = state.feedback?.trim()
      if (matchId && value) {
        const feedback = FEEDBACK_REASONS.has(value) ? { feedback_reason: value } : { feedback_text: value }
        patchMatch(matchId, 'dismissed', feedback).catch(() => {})
      }
      showToast('의견 고마워요. 다음 추천에 반영할게요.')
      dispatch({ type: 'RESET_AFTER_SEND' })
      navigate('/main')
    },

    goMain: () => navigate('/main'),
    openStorage: () => navigate('/storage'),
    setTab: (value) => dispatch({ type: 'SET_TAB', value }),
  }

  return (
    <AppStateContext.Provider value={{ state, actions, auth: { user, authLoading } }}>
      {children}
    </AppStateContext.Provider>
  )
}
