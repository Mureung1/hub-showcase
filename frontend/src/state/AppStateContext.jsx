import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createLetter,
  createRecommendation,
  refreshRecommendation as apiRefreshRecommendation,
  patchMatch,
  replyToMatch,
} from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { validateLetterContent, MIN_LETTER_LENGTH } from '../lib/validateLetter'
import { AppStateContext, TOAST_DURATION_MS, initialState, reducer } from './appStateStore'

// GET current 대신 POST(멱등)로 폴링한다 — 24h 전엔 DB 조회 한 번으로 바로 not_ready가
// 돌아와서 값싸고, 실제로 준비됐을 때는 이 호출이 곧 "생성 트리거"도 겸한다.
const RECOMMENDATION_POLL_MS = 30_000

// 백엔드가 has_match:false를 주더라도 "확정된 결과"로 취급해 대기 화면을 끝낼 사유들.
// not_ready만 "아직 더 기다려야 함"이라 폴링을 계속한다.
const TERMINAL_REASON_CODES = new Set(['support_needed', 'no_candidates', 'not_found', 'tagging_pending'])

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const navigate = useNavigate()
  const toastTimer = useRef(null)
  const sending = useRef(false) // 전송 중 중복 클릭 방지

  // 로그인 상태 — Supabase 세션 기준. authLoading이 끝나기 전엔 아직 로그인 여부를
  // 모르는 상태이므로(새로고침 직후 등) 라우트 보호에서 섣불리 리다이렉트하지 않는다.
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

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
    // RecommendPage(방금 받은 추천)에서 답장을 시작하는 경로.
    startReply: () => {
      dispatch({ type: 'START_REPLY', matchId: state.recommendation?.match_id ?? null })
      navigate('/main')
    },
    // 저장소 "받은 편지" 상세 화면 등, 세션에 남아있는 recommendation 없이도 matchId만 알면
    // 답장을 시작할 수 있는 경로. 새로고침/재로그인 후 예전 미해결 추천을 처리할 때 필요하다.
    startReplyToMatch: (matchId) => {
      dispatch({ type: 'START_REPLY', matchId })
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
      try {
        await replyToMatch(state.replyTargetMatchId, { title: state.title, content: state.letter })
        showToast('답장을 보냈어요. 8시간 뒤 상대에게 전달돼요.')
        dispatch({ type: 'RESET_AFTER_SEND' })
        navigate('/main')
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
    // 저장소 "받은 편지" 상세에서 바로 스쳐 가기 — RecommendPage의 피드백 모달 흐름과 달리
    // 지금 작성 중일 수 있는 편지(state.letter/title)를 건드리지 않는 독립적인 처리다.
    dismissMatchById: async (matchId) => {
      try {
        await patchMatch(matchId, 'dismissed')
        showToast('스쳐 갔어요.')
        navigate('/storage')
      } catch (err) {
        showToast(err.message || '처리하지 못했어요. 잠시 후 다시 시도해주세요.')
      }
    },
    setFeedback: (value) => dispatch({ type: 'SET_FEEDBACK', value }),
    closeFeedback: () => {
      dispatch({ type: 'RESET_AFTER_SEND' })
      navigate('/main')
    },
    sendFeedback: () => {
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
