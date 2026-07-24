import type { CoordinationCompound } from '../data/coordinationCompounds'

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** 배위 화합물 화학식(예: "[Co(NH3)6]3+")을 아래첨자·위첨자로 포맷한다.
 * 데이터의 formula 필드는 항상 "...]{숫자}{+|-}" 형태로 끝나므로, 그 끝부분만
 * 전하(위첨자)로, 나머지 숫자는 리간드 개수(아래첨자)로 구분해 처리한다. */
function formatCoordinationFormula(formula: string): string {
  const match = formula.match(/^(.*?)(\d+)([+-])$/)
  if (!match) return formula.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
  const [, body, chargeDigits, sign] = match
  const bodyFormatted = body.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
  const chargeFormatted = chargeDigits.replace(/\d/g, (d) => SUPERSCRIPTS[Number(d)]) + (sign === '+' ? '⁺' : '⁻')
  return bodyFormatted + chargeFormatted
}

/** PubChem 자유 검색 분자식(예: "CoH18N6+3")은 원소 개수만 믿을 수 있고
 * 배위수·기하구조 정보는 없다 — 숫자만 아래첨자로 바꿔 그대로 보여준다. */
function formatRawFormula(formula: string): string {
  return formula.replace(/\d/g, (d) => SUBSCRIPTS[Number(d)])
}

interface PresetProps {
  compound: CoordinationCompound
  freeFormula?: never
}
interface FreeSearchProps {
  compound?: never
  freeFormula: string | null
}

export default function CoordinationFormulaCard(props: PresetProps | FreeSearchProps) {
  if (props.compound) {
    const { compound } = props
    return (
      <div className="flex flex-col gap-3">
        <div className="text-2xl font-semibold tracking-wide text-zinc-100">
          {formatCoordinationFormula(compound.formula)}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
            배위수 {compound.coordinationNumber}
          </span>
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
            {compound.geometry}
          </span>
        </div>
      </div>
    )
  }

  const { freeFormula } = props
  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-semibold tracking-wide text-zinc-100">
        {freeFormula ? formatRawFormula(freeFormula) : '—'}
      </div>
      <p className="text-xs text-zinc-500">
        PubChem 분자식(원소 개수만입니다 — 전하 표기 순서가 관례와 다를 수 있고, 배위수·기하구조는
        믿을 수 있게 자동 판별할 수 없어 표시하지 않습니다).
      </p>
    </div>
  )
}
