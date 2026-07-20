import { Component } from 'react'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 렌더링 중 예외가 나면(방어 코드로 못 막은 버그 등) 앱 전체가 빈 흰 화면으로 죽는 대신, 새로고침을
// 유도하는 최소한의 폴백을 보여준다. 데이터 손상이 아니라 화면 표시 오류이므로 새로고침만으로 대부분
// 복구된다 — 상태 초기화/재시도 대신 새로고침을 안내하는 이유.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...styles.card, textAlign: 'center', marginBottom: 0 }}>
          <h2 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.lg, color: colors.textStrong }}>
            문제가 발생했어요
          </h2>
          <p style={{ margin: `0 0 ${spacing.lg}px`, color: colors.textSub, fontSize: font.size.sm }}>
            페이지를 새로고침하면 대부분 해결돼요.
          </p>
          <button type="button" className="tds-press" onClick={() => window.location.reload()} style={styles.buttonPrimary}>
            새로고침
          </button>
        </div>
      </div>
    )
  }
}
