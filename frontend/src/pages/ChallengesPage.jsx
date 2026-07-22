import { useEffect, useState } from 'react'
import ChallengeCard from '../components/ChallengeCard.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import { challenges } from '../data/challenges.js'
import { getSeedDocument } from '../data/documents.js'
import { loadMyPublished } from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

function ChallengesPage() {
  const auth = useAuth()
  const ongoing = challenges.filter((c) => c.status === 'ongoing')
  const ended = challenges.filter((c) => c.status === 'ended')
  // "내 제출작"은 반드시 내 문서만이어야 한다(예전엔 전체 발행 문서를 썼다).
  const [myDocs, setMyDocs] = useState([])
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

  return (
    <section>
      <header className="rs-page-head">
        <h1>챌린지</h1>
        <p>
          격주마다 공통 주제가 열립니다. 마감이 있어야 "일단 완성"이 되고, 같은 주제의 제출작을
          비교할 때 가장 많이 배웁니다.
        </p>
      </header>

      <div className="rs-challenge-list">
        {ongoing.map((challenge) => {
          const mine = mySubmissions(challenge.id)
          return (
            <div key={challenge.id}>
              <ChallengeCard challenge={challenge} />
              {mine.length > 0 && (
                <>
                  <h2 className="rs-challenge-sub">
                    내 제출작 {mine.length}편 — 다른 참가자 제출작은 마감 후 공개
                  </h2>
                  <div className="rs-grid">
                    {mine.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {ended.map((challenge) => {
        const submissions = [
          ...(challenge.submissionIds ?? []).map((id) => getSeedDocument(id)).filter(Boolean),
          ...mySubmissions(challenge.id),
        ]
        return (
          <div key={challenge.id}>
            <ChallengeCard challenge={challenge} compact />
            <h2 className="rs-challenge-sub">제출작 {submissions.length}편 — 좋아요 기반 베스트</h2>
            <div className="rs-grid">
              {submissions.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} isBest={doc.id === challenge.bestDocId} />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export default ChallengesPage
