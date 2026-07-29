import { useEffect, useState } from 'react'
import { getDashboardSummary, getSubscriptions } from '../lib/subscriptions'
import './Dashboard.css'

const MONTHS_TO_SHOW = 5

function computeMonthlyTrend(items, monthsToShow) {
  const now = new Date()

  return Array.from({ length: monthsToShow }, (_, index) => {
    const offset = monthsToShow - 1 - index
    const target = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 1)

    const amount = items
      .filter((item) => new Date(item.createdAt) < monthEnd)
      .reduce((sum, item) => sum + item.myAmount, 0)

    return { label: `${target.getMonth() + 1}월`, amount }
  })
}

function computeBarHeights(trend) {
  const maxAmount = Math.max(...trend.map((month) => month.amount), 1)

  return trend.map((month, index) => ({
    ...month,
    heightPercent: Math.max((month.amount / maxAmount) * 100, month.amount > 0 ? 4 : 0),
    isCurrent: index === trend.length - 1,
  }))
}

const Dashboard = () => {
  const [status, setStatus] = useState('loading')
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    Promise.all([getDashboardSummary(), getSubscriptions()])
      .then(([dashboardSummary, items]) => {
        setSummary(dashboardSummary)
        setTrend(computeMonthlyTrend(items, MONTHS_TO_SHOW))
        setStatus('success')
      })
      .catch((error) => {
        setErrorMessage(error.message)
        setStatus('error')
      })
  }, [])

  if (status === 'loading') {
    return <p className="dashboard-message">대시보드를 불러오는 중...</p>
  }

  if (status === 'error') {
    return <p className="dashboard-message">{errorMessage}</p>
  }

  const bars = computeBarHeights(trend)

  return (
    <div className="dashboard">
      <p className="dashboard-label">이번 달 내가 실제로 부담하는 구독료</p>
      <p className="dashboard-amount">
        {summary.totalMyAmount.toLocaleString()}
        <span className="dashboard-amount-unit">원</span>
      </p>
      <p className="dashboard-note">전체 금액 {summary.totalSubAmount.toLocaleString()}원 중 내 몫만 계산했어요</p>

      <p className="dashboard-label dashboard-label-chart">월별 지출 추이</p>
      <div className="dashboard-bar-chart">
        {bars.map((bar) => (
          <div className="dashboard-bar-col" key={bar.label}>
            <span className="dashboard-bar-value">{bar.amount.toLocaleString()}</span>
            <div
              className={`dashboard-bar${bar.isCurrent ? ' dashboard-bar-current' : ''}`}
              style={{ height: `${bar.heightPercent}%` }}
            />
            <span className="dashboard-bar-month">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
