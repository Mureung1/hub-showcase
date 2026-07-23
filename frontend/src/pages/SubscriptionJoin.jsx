import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { joinSubscription, previewSubscription } from '../lib/subscriptions'
import { getToken } from '../lib/auth'
import LoginRequired from '../components/LoginRequired'
import './SubscriptionJoin.css'

const SubscriptionJoin = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState(getToken() ? 'loading' : 'checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [serviceName, setServiceName] = useState('')

  useEffect(() => {
    if (getToken()) {
      joinSubscription(id)
        .then(() => {
          navigate(`/subscriptions/${id}`, { replace: true })
        })
        .catch((error) => {
          if (error.status === 409) {
            navigate(`/subscriptions/${id}`, { replace: true })
            return
          }
          setErrorMessage(error.message)
          setStatus(error.status === 404 ? 'notfound' : 'error')
        })
      return
    }

    previewSubscription(id)
      .then((data) => {
        setServiceName(data.serviceName)
        setStatus('unauthorized')
      })
      .catch((error) => {
        setErrorMessage(error.message)
        setStatus(error.status === 404 ? 'notfound' : 'error')
      })
  }, [id, navigate])

  if (status === 'checking') {
    return (
      <div className="subscription-join-page">
        <p className="subscription-join-message">초대 링크 확인 중...</p>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return (
      <div className="subscription-join-page">
        <LoginRequired
          message={
            <>
              <strong className="subscription-join-service-name">{serviceName}</strong> 파티에 초대되었어요. 로그인하고 참여해보세요.
            </>
          }
          state={id}
        />
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div className="subscription-join-page">
        <p className="subscription-join-message">존재하지 않는 초대 링크예요.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="subscription-join-page">
        <p className="subscription-join-message">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="subscription-join-page">
      <p className="subscription-join-message">가입 처리 중...</p>
    </div>
  )
}

export default SubscriptionJoin
