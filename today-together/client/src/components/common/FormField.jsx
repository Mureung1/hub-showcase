// as: "input" | "textarea" | "select"
// options: as="select"일 때 사용할 [{ value, label }] 배열

export default function FormField({
  label,
  as = "input",
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  options = [],
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>

      {as === "textarea" && (
        <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} />
      )}

      {as === "select" && (
        <select id={name} name={name} value={value} onChange={onChange}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {as === "input" && (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
