import type { RepoSummary } from "../lib/api";

interface Props {
  repos: RepoSummary[];
  value: string;
  disabled: boolean;
  loading: boolean;
  onChange: (fullName: string) => void;
}

export default function RepoSelect({ repos, value, disabled, loading, onChange }: Props) {
  return (
    <div className="field">
      <label className="label-mono">REPOSITORY</label>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">
          {disabled ? "로그인 후 선택 가능" : loading ? "불러오는 중…" : "저장소를 선택하세요"}
        </option>
        {repos.map((r) => (
          <option key={r.full_name} value={r.full_name}>
            {r.full_name}
            {r.private ? " 🔒" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
