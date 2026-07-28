import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addBookmark, getBookmarks, removeBookmark } from '../api/bookmarks'

// 결과 화면의 공고 목록 중 어떤 것이 이미 북마크됐는지 알아야 북마크 아이콘을 채워 보여줄 수 있다 —
// 로그인한 사용자의 전체 북마크 id 목록을 한 번 받아와서 Set으로 들고 있다가 토글마다 갱신한다.
// (BookmarksPage는 이 훅을 쓰지 않는다 — 거기서 보여주는 목록 자체가 곧 북마크 목록이라
// "이미 북마크인지" 여부를 따로 조회할 필요가 없다.)
export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set())

  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set())
      return
    }
    let cancelled = false
    getBookmarks().then((jobs) => {
      if (!cancelled) setBookmarkedIds(new Set(jobs.map((job) => job.job_id)))
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const toggle = useCallback(async (jobId) => {
    if (bookmarkedIds.has(jobId)) {
      await removeBookmark(jobId)
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    } else {
      await addBookmark(jobId)
      setBookmarkedIds((prev) => new Set(prev).add(jobId))
    }
  }, [bookmarkedIds])

  return { isBookmarked: (jobId) => bookmarkedIds.has(jobId), toggle }
}
