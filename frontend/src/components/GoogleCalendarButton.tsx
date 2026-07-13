import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { calendarApi } from '../utils/apiClient'

interface GoogleCalendarButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function GoogleCalendarButton({ onSuccess, onError }: GoogleCalendarButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await calendarApi.getStatus()
      const calendarStatus = response?.data
      setIsConnected(calendarStatus?.connected || false)
    } catch (error) {
      console.error('캘린더 상태 확인 실패:', error)
    }
  }

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsLoading(true)
      try {
        await calendarApi.oauthCallback(codeResponse.code)
        setIsConnected(true)
        onSuccess?.()
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Google Calendar 연동 실패'
        console.error(errorMsg)
        onError?.(errorMsg)
      } finally {
        setIsLoading(false)
      }
    },
    onError: () => {
      const errorMsg = 'Google OAuth 실패'
      console.error(errorMsg)
      onError?.(errorMsg)
    },
    flow: 'auth-code',
  })

  return (
    <button
      onClick={() => login()}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 12px',
        backgroundColor: isConnected ? '#10b981' : '#ffffff',
        color: isConnected ? '#ffffff' : '#1f2937',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.6 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      <span>{isConnected ? '✓' : '🔗'}</span>
      {isConnected ? 'Google Calendar 연동됨' : 'Google Calendar 연동'}
    </button>
  )
}
