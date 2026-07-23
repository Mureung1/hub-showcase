import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setToken } from '../lib/auth'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const [failed] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    return !params.get('token')
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    if (token) {
      setToken(token)
      const redirect = params.get('redirect') || '/'
      navigate(redirect, { replace: true })
    }
  }, [navigate])

  if (failed) {
    return (
      <div>
        <p>로그인에 실패했습니다.</p>
        <Link to="/">홈으로 돌아가기</Link>
      </div>
    )
  }

  return <p>로그인 처리 중...</p>
}

export default OAuthCallback
