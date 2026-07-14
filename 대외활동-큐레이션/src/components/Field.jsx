// 드롭다운 한 칸. 항상 "선택 안 함"(null)을 포함한다.
export default function Field({ label, value, onChange, options, parse = String, format = (v) => v }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : parse(e.target.value))}>
        <option value="">선택 안 함</option>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  );
}
