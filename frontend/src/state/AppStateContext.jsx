import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppStateContext, TOAST_DURATION_MS, initialState, reducer } from './appStateStore'

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const navigate = useNavigate()
  const toastTimer = useRef(null)

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
    login: () => navigate('/main'),

    setTitle: (value) => dispatch({ type: 'SET_TITLE', value }),
    setLetter: (value) => dispatch({ type: 'SET_LETTER', value }),

    // main → send : 편지가 비어 있으면 토스트 경고만 띄우고 이동하지 않는다
    toSend: () => {
      if (!state.letter.trim()) {
        showToast('편지 내용을 먼저 적어주세요.')
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
    reallySend: () => {
      dispatch({ type: 'HIDE_CONFIRM' })
      dispatch({ type: 'SHOW_ARRIVED' })
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

  return <AppStateContext.Provider value={{ state, actions }}>{children}</AppStateContext.Provider>
}
