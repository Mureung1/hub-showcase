interface Props {
  branches: string[];
  value: string;
  disabled: boolean;
  loading: boolean;
  onChange: (branch: string) => void;
}

export default function BranchSelect({ branches, value, disabled, loading, onChange }: Props) {
  return (
    <div className="field">
      <label className="label-mono">BRANCH</label>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">
          {disabled ? "저장소 선택 후 선택 가능" : loading ? "불러오는 중…" : "Branch를 선택하세요"}
        </option>
        {branches.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </div>
  );
}
