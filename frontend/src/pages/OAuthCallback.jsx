import { useEffect, useState } from 'react'
import { setToken } from '../lib/auth'

const OAuthCallback = () => {
  const [failed] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    return !params.get('token')
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    if (token) {
      setToken(token)
      window.location.replace('/login')
    }
  }, [])

  if (failed) {
    return (
      <div>
        <p>로그인에 실패했습니다.</p>
        <a href="/login">로그인 페이지로 돌아가기</a>
      </div>
    )
  }

  return <p>로그인 처리 중...</p>
}

export default OAuthCallback
