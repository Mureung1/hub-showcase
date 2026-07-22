import './RoleBadge.css'

const ROLE_LABEL = {
  owner: '파티장',
  member: '파티원',
}

const RoleBadge = ({ role }) => (
  <span className={`role-badge role-badge-${role}`}>{ROLE_LABEL[role]}</span>
)

export default RoleBadge
