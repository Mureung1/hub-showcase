// claude: ProgressBar(막대 채움 비율)와 AdminDashboard(옆에 텍스트로 표시하는 퍼센트)가 같은 계산식을 쓰도록 분리한 순수 함수.
export function calculateProgressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}
