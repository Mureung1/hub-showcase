import { Link } from 'react-router'

function HomePage() {
  return (
    <div className="page-stack">
      <Link to="/new" className="button">
        약속 만들기
      </Link>
      <Link to="/join" className="button button--secondary">
        기존 약속 참여하기
      </Link>
    </div>
  )
}

export default HomePage
