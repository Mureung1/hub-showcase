import { useEffect, useState } from 'react'
import ChallengeCard from '../components/ChallengeCard.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import { challenges } from '../data/challenges.js'
import { getSeedDocument } from '../data/documents.js'
import { loadMyPublished, loadPublished } from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

// AI 점수 내림차순(없으면 뒤로), 동점이면 좋아요순.
function byScore(a, b) {
  const sa = a.aiScore ?? -1
  const sb = b.aiScore ?? -1
  if (sb !== sa) return sb - sa
  return (b.likes ?? 0) - (a.likes ?? 0)
}

function ChallengesPage() {
  const auth = useAuth()
  const ongoing = challenges.filter((c) => c.status === 'ongoing')
  const ended = challenges.filter((c) => c.status === 'ended')

  // "내 제출작"은 반드시 내 문서만. 리더보드(종료 챌린지)는 전체 발행작에서 모은다.
  const [myDocs, setMyDocs] = useState([])
  const [allDocs, setAllDocs] = useState([])

  useEffect(() => {
    loadPublished()
      .then(setAllDocs)
      .catch(() => setAllDocs([]))
  }, [])

  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn) {
      setMyDocs([])
      return
    }
    loadMyPublished()
      .then(setMyDocs)
      .catch(() => setMyDocs([]))
  }, [auth.loading, auth.isLoggedIn])

  const mySubmissions = (challengeId) => myDocs.filter((d) => d.challengeId === challengeId)
  const allSubmissions = (challengeId) => allDocs.filter((d) => d.challengeId === challengeId)

  return (
    <section>
      <header className="rs-page-head">
        <h1>챌린지</h1>
        <p>
          여러 주제가 동시에 열립니다. 제출하면 AI가 채점 기준에 따라 <strong>참고 점수</strong>를
          매기고, 마감 후 제출작이 점수순으로 공개돼요.
        </p>
      </header>

      <div className="rs-challenge-list">
        {ongoing.map((challenge) => {
          const mine = mySubmissions(challenge.id)
          const total = allSubmissions(challenge.id).length
          return (
            <div key={challenge.id}>
              <ChallengeCard challenge={challenge} />
              {mine.length > 0 ? (
                <>
                  <h2 className="rs-challenge-sub">
                    내 제출작 {mine.length}편 · 참가 {total}명 — 다른 제출작은 마감 후 점수순 공개
                  </h2>
                  <div className="rs-grid">
                    {mine.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </>
              ) : (
                total > 0 && (
                  <p className="rs-challenge-sub">
                    현재 {total}명 참가 중 — 제출작은 마감 후 점수순으로 공개돼요.
                  </p>
                )
              )}
            </div>
          )
        })}
      </div>

      {ended.map((challenge) => {
        // 시드 제출작 + 실제 발행작을 합쳐 중복 제거 후 점수순 랭킹.
        const merged = new Map()
        for (const id of challenge.submissionIds ?? []) {
          const d = getSeedDocument(id)
          if (d) merged.set(d.id, d)
        }
        for (const d of allSubmissions(challenge.id)) merged.set(d.id, d)
        const ranked = [...merged.values()].sort(byScore)
        const bestId = ranked[0]?.id ?? challenge.bestDocId

        return (
          <div key={challenge.id}>
            <ChallengeCard challenge={challenge} compact />
            <h2 className="rs-challenge-sub">제출작 {ranked.length}편 — AI 점수순 랭킹</h2>
            <div className="rs-grid">
              {ranked.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} isBest={doc.id === bestId} />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export default ChallengesPage
