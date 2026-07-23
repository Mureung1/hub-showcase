import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLetter } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { validateLetterContent } from '../lib/validateLetter'
import { AppStateContext, TOAST_DURATION_MS, initialState, reducer } from './appStateStore'

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

  // 대기 화면 24h 카운트다운 클럭
  useEffect(() => {
    if (state.phase !== 'waiting') return undefined
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.phase])

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

    // main → send : 편지가 비어 있거나 너무 길면 토스트 경고만 띄우고 이동하지 않는다
    toSend: () => {
      if (!validateLetterContent(state.letter)) {
        showToast(
          state.letter.trim() ? '편지가 너무 길어요.' : '편지 내용을 먼저 적어주세요.',
        )
        return
      }
      navigate('/send')
    },

    setEnvelope: (value) => dispatch({ type: 'SET_ENVELOPE', value }),
    askConfirm: () => {
      if (!state.envelope) {
        showToast('봉투를 선택해주세요.')
        return
      }
      dispatch({ type: 'SHOW_CONFIRM' })
    },
    cancelConfirm: () => dispatch({ type: 'HIDE_CONFIRM' }),
    reallySend: async () => {
      if (sending.current) return
      sending.current = true
      try {
        await createLetter({ title: state.title, content: state.letter, envelope: state.envelope })
        dispatch({ type: 'HIDE_CONFIRM' })
        dispatch({ type: 'SHOW_ARRIVED' })
      } catch {
        dispatch({ type: 'HIDE_CONFIRM' })
        showToast('편지를 보내지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        sending.current = false
      }
    },
    closeArrived: () => {
      dispatch({ type: 'START_WAITING' })
      navigate('/sent')
    },

    fastForward: () => dispatch({ type: 'FAST_FORWARD' }),
    openRecommend: () => {
      dispatch({ type: 'RESET_RECOMMEND' })
      navigate('/recommend')
    },

    unfold: () => dispatch({ type: 'UNFOLD' }),
    startReply: () => {
      dispatch({ type: 'START_REPLY' })
      navigate('/main')
    },
    cancelReply: () => dispatch({ type: 'CANCEL_REPLY' }),
    sendReply: () => {
      showToast('답장을 보냈어요. 8시간 뒤 상대에게 전달돼요.')
      dispatch({ type: 'RESET_AFTER_SEND' })
      navigate('/main')
    },

    passBy: () => dispatch({ type: 'SHOW_FEEDBACK' }),
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
