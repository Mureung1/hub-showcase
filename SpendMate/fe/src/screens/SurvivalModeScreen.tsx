interface SurvivalModeScreenProps {
  remaining: number
  total: number
  daysLeft: number
  onGoToSettings: () => void
}

export default function SurvivalModeScreen({ remaining, total, daysLeft, onGoToSettings }: SurvivalModeScreenProps) {
  const todayLimit = Math.floor(remaining / daysLeft)
  const depleted = Math.round(((total - remaining) / total) * 100)

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(160deg, #0D0D0D 0%, #1A0A0A 50%, #1A0D00 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 20px 40px', fontFamily: 'Pretendard',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,107,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,87,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#FF6B6B', textTransform: 'uppercase' }}>SURVIVAL MODE</span>
      </div>
      <h1 style={{ margin: '4px 0 0', width: '100%', fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', position: 'relative' }}>월말 생존 작전</h1>

      {/* Depletion bar */}
      <div style={{ width: '100%', marginTop: 20, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>예산 소진율</span>
          <span style={{ fontSize: 11, color: '#FFC857', fontWeight: 700 }}>{depleted}% 사용됨</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${depleted}%`, borderRadius: 8, background: 'linear-gradient(90deg, #FFC857, #FF6B6B)' }} />
        </div>
      </div>

      {/* Hero — today's limit */}
      <div style={{
        width: '100%', marginTop: 20,
        background: 'linear-gradient(135deg, rgba(255,200,87,0.15) 0%, rgba(255,107,107,0.08) 100%)',
        border: '1px solid rgba(255,107,107,0.25)', borderRadius: 24, padding: '28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>오늘 쓸 수 있는 금액</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-2px', lineHeight: 1 }}>
            {todayLimit.toLocaleString()}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.6)', paddingBottom: 4 }}>원</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#FFC857' }}>⚡ 이 금액만 쓰면 달 끝까지 버텨요!</p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

        <div style={{ display: 'flex', gap: 12 }}>
          <StatPill label="남은 예산" value={`${remaining.toLocaleString()}원`} icon="💰" color="#FFC857" />
          <StatPill label="남은 날수" value={`${daysLeft}일`} icon="📅" color="#6ED6C8" />
        </div>
      </div>

      {/* Timeline strip */}
      <div style={{ width: '100%', marginTop: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>남은 기간 ({daysLeft}일)</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: daysLeft }, (_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 4,
              background: i === 0 ? 'linear-gradient(90deg, #FF6B6B, #FFC857)' : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>오늘</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>월말</span>
        </div>
      </div>

      {/* AI Mission box */}
      <div style={{ width: '100%', marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>AI 절약 미션</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { text: '배달 주 2회 이하로 줄이기', save: '+18,500원' },
            { text: '편의점 대신 마트 이용', save: '+8,000원' },
            { text: '텀블러 지참 카페 절약', save: '+6,500원' },
          ].map((m) => (
            <div key={m.text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{m.text}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>{m.save}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)' }}>
          <span style={{ fontSize: 12, color: '#6ED6C8' }}>
            미션 완료 시 예상 절약 총액 <strong style={{ color: '#4F8EF7' }}>+33,000원</strong>
          </span>
        </div>
      </div>

      {/* Tip */}
      <div style={{ width: '100%', marginTop: 16, background: 'rgba(255,200,87,0.06)', border: '1px solid rgba(255,200,87,0.15)', borderRadius: 16, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#FFC857' }}>오늘의 절약 팁</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            집에 있는 재료로 한 끼 해결하면 오늘 한도를 내일로 이월할 수 있어요.
          </p>
        </div>
      </div>

      {/* Settings shortcut */}
      <button onClick={onGoToSettings} style={{
        marginTop: 28, padding: '14px 40px', borderRadius: 14,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', fontFamily: 'Pretendard',
      }}>
        설정에서 끄기 →
      </button>
    </div>
  )
}

function StatPill({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</p>
    </div>
  )
}
