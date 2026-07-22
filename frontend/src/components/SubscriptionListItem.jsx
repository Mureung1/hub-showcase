import { Link } from 'react-router-dom'
import { getServiceColor } from '../lib/serviceColor'
import RoleBadge from './RoleBadge'
import './SubscriptionListItem.css'

const SubscriptionListItem = ({ subscription }) => {
  const { id, serviceName, billingDay, memberCount, myAmount, role } = subscription

  return (
    <Link to={`/subscriptions/${id}`} className="subscription-list-item">
      <span className="subscription-dot" style={{ backgroundColor: getServiceColor(serviceName) }} />
      <div className="subscription-info">
        <p className="subscription-name">{serviceName}</p>
        <p className="subscription-meta">매달 {billingDay}일 · {memberCount === 1 ? '개인' : `${memberCount}인 공유`}</p>
      </div>
      <div className="subscription-summary">
        <p className="subscription-amount">{myAmount.toLocaleString()}원</p>
        <RoleBadge role={role} />
      </div>
    </Link>
  )
}

export default SubscriptionListItem
