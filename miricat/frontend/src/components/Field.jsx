    export default function Field({ label, value, sub }) {
  return (
    <div className="field">
      <label>{label}</label>              {/* label 넣기 */}
      <div className="input">
        {value}                           {/* value 넣기 */}
        <span className="mono">· {sub}</span>   {/* sub 넣기 */}
      </div>
    </div>
  );
}