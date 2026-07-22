import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-lg text-gray-600 mt-2">페이지를 찾을 수 없습니다</p>
        <Link
          to="/dashboard"
          className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}

export default NotFound