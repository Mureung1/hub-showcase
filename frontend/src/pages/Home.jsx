import { useEffect, useState } from 'react'
import Dashboard from '../components/Dashboard'
import SubscriptionList from '../components/SubscriptionList'
import LoginRequired from '../components/LoginRequired'
import { fetchMe } from '../lib/auth'
import './Home.css'

const Home = () => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return null
  }

  if (!user) {
    return <LoginRequired message="SUBZIP으로 내 구독료 지출, 한눈에 확인해보세요!" />
  }

  return (
    <div className="home-page">
      <Dashboard />
      <SubscriptionList />
    </div>
  )
}

export default Home
