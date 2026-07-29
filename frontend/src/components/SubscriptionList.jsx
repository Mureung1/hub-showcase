import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSubscriptions } from '../lib/subscriptions'
import SubscriptionListItem from './SubscriptionListItem'
import './SubscriptionList.css'

const SubscriptionList = () => {
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    getSubscriptions()
      .then((subscriptions) => {
        setItems(subscriptions)
        setStatus('success')
      })
      .catch((error) => {
        setErrorMessage(error.message)
        setStatus('error')
      })
  }, [])

  if (status === 'loading') {
    return <p className="subscription-list-message">불러오는 중...</p>
  }

  if (status === 'error') {
    return <p className="subscription-list-message">{errorMessage}</p>
  }

  if (items.length === 0) {
    return (
      <div className="subscription-list-message">
        <p>등록된 구독 서비스가 없어요.</p>
        <Link to="/subscriptions/new" className="link-btn">+ 구독 서비스 등록하기</Link>
      </div>
    )
  }

  return (
    <div className="subscription-list">
      {items.map((subscription) => (
        <SubscriptionListItem key={subscription.id} subscription={subscription} />
      ))}
    </div>
  )
}

export default SubscriptionList
