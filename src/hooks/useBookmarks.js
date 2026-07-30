import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addBookmark, getBookmarks, removeBookmark } from '../api/bookmarks'

// 결과 화면의 공고 목록 중 어떤 것이 이미 북마크됐는지 알아야 북마크 아이콘을 채워 보여줄 수 있다 —
// 로그인한 사용자의 전체 북마크 id 목록을 한 번 받아와서 Set으로 들고 있다가 토글마다 갱신한다.
// (BookmarksPage는 이 훅을 쓰지 않는다 — 거기서 보여주는 목록 자체가 곧 북마크 목록이라
// "이미 북마크인지" 여부를 따로 조회할 필요가 없다.)
export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set())
  // toggle이 await하는 동안 같은 jobId를 다시 클릭하면 둘 다 같은(토글 전) state를 보고 같은 요청을
  // 중복으로 보내는 레이스가 있었다 — bookmarkedIds state 대신 ref로 최신 값을 동기적으로 추적하고,
  // 같은 jobId에 대한 요청이 진행 중이면 새 클릭은 무시한다.
  const bookmarkedIdsRef = useRef(bookmarkedIds)
  const pendingRef = useRef(new Set())

  const updateBookmarkedIds = useCallback((next) => {
    bookmarkedIdsRef.current = next
    setBookmarkedIds(next)
  }, [])

  useEffect(() => {
    if (!user) {
      updateBookmarkedIds(new Set())
      return
    }
    let cancelled = false
    getBookmarks().then((jobs) => {
      if (!cancelled) updateBookmarkedIds(new Set(jobs.map((job) => job.job_id)))
    })
    return () => {
      cancelled = true
    }
  }, [user, updateBookmarkedIds])

  const toggle = useCallback(async (jobId) => {
    if (pendingRef.current.has(jobId)) return
    pendingRef.current.add(jobId)
    try {
      const wasBookmarked = bookmarkedIdsRef.current.has(jobId)
      if (wasBookmarked) {
        await removeBookmark(jobId)
      } else {
        await addBookmark(jobId)
      }
      const next = new Set(bookmarkedIdsRef.current)
      if (wasBookmarked) next.delete(jobId)
      else next.add(jobId)
      updateBookmarkedIds(next)
    } finally {
      pendingRef.current.delete(jobId)
    }
  }, [updateBookmarkedIds])

  return { isBookmarked: (jobId) => bookmarkedIds.has(jobId), toggle }
}
