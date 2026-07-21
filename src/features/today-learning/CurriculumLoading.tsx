import { useEffect, useState } from 'react'
import styles from './CurriculumLoading.module.css'

const loadingMessages = [
  '학습 목표를 분석하고 있습니다...',
  '공식 문서를 탐색 중입니다...',
  '난이도에 맞는 실습 미션을 구성하는 중입니다...',
  '거의 다 되었습니다...'
]

export function CurriculumLoading() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.loadingContainer} aria-live="polite">
      <div className={styles.glowIndicator}>
        <div className={styles.glowCircle} />
      </div>
      <p className={styles.loadingMessage}>{loadingMessages[messageIndex]}</p>
      
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonList}>
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
        </div>
      </div>
    </div>
  )
}
