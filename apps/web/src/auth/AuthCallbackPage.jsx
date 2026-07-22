import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth.js'
import styles from '../features/landing/LandingPage.module.css'

function callbackError() {
  const query = new URLSearchParams(globalThis.location.search)
  const hash = new URLSearchParams(globalThis.location.hash.replace(/^#/, ''))
  return query.get('error_description') || hash.get('error_description') || ''
}

export function AuthCallbackPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const oauthError = useMemo(callbackError, [])
  const { status, error, consumeReturnTo } = auth

  useEffect(() => {
    if (status === 'authenticated') navigate(consumeReturnTo(), { replace: true })
  }, [status, consumeReturnTo, navigate])

  if (oauthError || status === 'anonymous') {
    return (
      <main className={styles.callbackPage}>
        <div><span className={styles.brandMark}>TF</span><h1>로그인을 완료하지 못했습니다.</h1><p>{oauthError || error || 'Google 인증이 취소되었거나 만료되었습니다.'}</p><Link to="/">홈으로 돌아가기</Link></div>
      </main>
    )
  }

  return <div className="app-loading" role="status">Google 로그인 정보를 안전하게 확인하고 있습니다.</div>
}
