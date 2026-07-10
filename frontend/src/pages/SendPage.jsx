import { useAppState } from '../state/useAppState'
import Envelope from '../components/Envelope'
import styles from './SendPage.module.css'

const ENVELOPES = [
  { id: 'basic', label: '기본 봉투' },
  { id: 'lined', label: '라인 봉투' },
  { id: 'wax', label: '밀랍 봉투' },
]

export default function SendPage() {
  const { state, actions } = useAppState()

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>어떤 봉투에 담을까요?</h1>

      <div className={styles.envelopes}>
        {ENVELOPES.map(({ id, label }) => (
          <div key={id} className={styles.envelopeItem}>
            <Envelope
              variant={id}
              selected={state.envelope === id}
              onClick={() => actions.setEnvelope(id)}
              label={label}
            />
            <p className={styles.envelopeLabel}>{label}</p>
          </div>
        ))}
      </div>

      <div className={styles.warning}>
        <span className="msymf">lock</span>
        수정할 수 없습니다
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnOutline} onClick={actions.goMain}>
          다시 쓰기
        </button>
        <button type="button" className={styles.btnPrimary} onClick={actions.askConfirm}>
          모음소로 보내기
        </button>
      </div>
    </div>
  )
}
