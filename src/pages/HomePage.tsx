import Panel from '../components/Panel'

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">
        전공 시각화 학습실에 오신 것을 환영합니다
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        왼쪽 사이드바에서 전공과 학습 도구를 선택하세요.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Panel title="cs / sorting.tsx">
          <h2 className="text-base font-semibold text-zinc-100">컴퓨터공학과</h2>
          <p className="mt-2 text-sm text-zinc-400">
            배열 셀을 직접 움직이며 정렬 알고리즘의 동작 과정을 시각화합니다.
          </p>
        </Panel>
        <Panel title="chemistry / viewer.tsx">
          <h2 className="text-base font-semibold text-zinc-100">화학과</h2>
          <p className="mt-2 text-sm text-zinc-400">
            SMILES(또는 분자 이름)를 입력하면 2D 골격구조식과 3D 구조를 보여줍니다.
          </p>
        </Panel>
      </div>
    </div>
  )
}
