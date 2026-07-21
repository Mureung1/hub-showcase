import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check-big.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { Navigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth.js'
import styles from './LandingPage.module.css'

const features = [
  { icon: CheckCircle2, title: '할 일을 한눈에', copy: '담당자와 마감일, 진행 상태를 팀과 함께 관리하세요.' },
  { icon: Users, title: '역할이 보이는 팀', copy: '누가 어떤 일을 맡고 있는지 프로젝트 안에서 바로 확인하세요.' },
  { icon: Sparkles, title: 'AI 팀원으로 확장', copy: '반복되는 조사와 정리를 맡길 수 있는 팀 공간을 준비합니다.' },
]

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3a10 10 0 0 0 0 9.3L6.4 14Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/></svg>
}

export function LandingPage() {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/projects'

  if (auth.status === 'loading') return <div className="app-loading" role="status">로그인 상태를 확인하고 있습니다.</div>
  if (auth.status === 'authenticated' || auth.status === 'guest') return <Navigate replace to="/projects" />

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <header className={styles.brand}><span className={styles.brandMark}>TF</span><strong>TeamFlow</strong></header>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Layers3 size={14} />함께 끝내는 프로젝트</span>
          <h1>팀의 흐름이<br /><em>한곳에서 보이도록.</em></h1>
          <p>할 일, 팀원, 노트와 자료를 흩어두지 마세요. TeamFlow는 가볍게 시작하고 분명하게 끝내는 팀 프로젝트 공간입니다.</p>
        </div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={17} /></span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div>
      </section>

      <section className={styles.authPanel} aria-labelledby="welcome-title">
        <div className={styles.authCard}>
          <span className={styles.mobileMark}>TF</span>
          <p className={styles.authEyebrow}>WELCOME TO TEAMFLOW</p>
          <h2 id="welcome-title">프로젝트를 시작해 볼까요?</h2>
          <p className={styles.authDescription}>Google 계정으로 안전하게 시작하거나 데모 워크스페이스를 먼저 둘러보세요.</p>
          {auth.error ? <p className={styles.authError} role="alert">{auth.error}</p> : null}
          <button className={styles.googleButton} type="button" disabled={auth.status === 'loading'} onClick={() => auth.signInWithGoogle(returnTo)}><GoogleMark />Google로 계속하기</button>
          <div className={styles.divider}><span>또는</span></div>
          <button className={styles.guestButton} type="button" disabled={auth.status === 'loading'} onClick={auth.enterGuest}>게스트로 둘러보기 <ArrowRight size={15} /></button>
          <small>게스트 모드는 읽기 전용이며 브라우저 탭을 닫으면 종료됩니다.</small>
        </div>
      </section>
    </main>
  )
}
