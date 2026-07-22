import { Link } from 'react-router-dom'

const ServerError = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">500</h1>
        <p className="text-lg text-gray-600 mt-2">서버 오류가 발생했습니다</p>
        <p className="text-sm text-gray-500 mt-1">잠시 후 다시 시도해주세요</p>
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

export default ServerError