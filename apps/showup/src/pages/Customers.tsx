import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '@/hooks/useAuth'
import { searchCustomers } from '@/services/customers'
import type { CustomerSearchResult } from '@/types/schema'
import Input from '@/components/ui/Input'
import RiskBadge from '@/components/RiskBadge'
import RiskAlertBanner from '@/components/RiskAlertBanner'

const Customers = () => {
  const { user } = useAuthState()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 검색 실행
  useEffect(() => {
    const runSearch = async () => {
      if (!user || !debouncedQuery.trim()) {
        setResults([])
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const data = await searchCustomers(user.uid, debouncedQuery)
        setResults(data)
      } catch (err) {
        console.error('Search failed:', err)
        setError('검색 중 오류가 발생했습니다')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    runSearch()
  }, [user, debouncedQuery])

  // 경고 배너 표시 (결과 중 위험 고객)
  const showAlert = results.some(
    (r) => r.riskStats.noShowCount >= 3 || r.riskStats.incidentCounts.abuse >= 1
  )

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
        <p className="text-sm text-gray-500 mt-1">전화번호 뒤 4 자리 또는 이름으로 검색하세요</p>
      </header>

      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="전화 뒤 4 자리 또는 이름"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Alert Banner */}
      {showAlert && (
        <div className="mb-4">
          <RiskAlertBanner
            noShowCount={results.find((r) => r.riskStats.noShowCount >= 3)?.riskStats.noShowCount || 0}
            incidentCounts={results.find((r) => r.riskStats.incidentCounts.abuse >= 1)?.riskStats.incidentCounts || { abuse: 0, dispute: 0, late: 0, unreasonable: 0 }}
          />
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>검색 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={() => setDebouncedQuery(debouncedQuery)}
              className="text-sm text-blue-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : results.length === 0 ? (
          debouncedQuery ? (
            <div className="text-center py-8 text-gray-500">
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>전화번호 뒤 4 자리 또는 이름을 입력하세요</p>
            </div>
          )
        ) : (
          results.map((customer) => (
            <Link
              key={customer.id}
              to={`/app/customers/${customer.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{customer.phoneMasked}</p>
                </div>
                <RiskBadge score={customer.riskStats.score} />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Add new customer */}
      <div className="mt-6">
        <Link
          to="/app/customers/new"
          className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + 신규 고객 등록
        </Link>
      </div>
    </div>
  )
}

export default Customers
