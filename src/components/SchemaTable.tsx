type SchemaTableProps = {
  table: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    key: string;
    desc: string;
  }>;
  classNameTable?: string;
  classNameTh?: string;
  classNameTd?: string;
  classNameBadge?: string;
};

export default function SchemaTable({
  table,
  description,
  columns,
  classNameTable,
  classNameTh,
  classNameTd,
  classNameBadge,
}: SchemaTableProps) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ margin: "0 0 6px", color: "var(--color-primary)", fontSize: "18px" }}>📁 {table}</h3>
      <p style={{ margin: "0 0 12px", color: "var(--color-text-body)", fontSize: "14px" }}>{description}</p>
      <table className={classNameTable} style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr>
            <th className={classNameTh} style={{ textAlign: "left", padding: "10px", borderBottom: "2px solid var(--color-border)" }}>컬럼명</th>
            <th className={classNameTh} style={{ textAlign: "left", padding: "10px", borderBottom: "2px solid var(--color-border)" }}>데이터 타입</th>
            <th className={classNameTh} style={{ textAlign: "left", padding: "10px", borderBottom: "2px solid var(--color-border)" }}>제약 조건</th>
            <th className={classNameTh} style={{ textAlign: "left", padding: "10px", borderBottom: "2px solid var(--color-border)" }}>설명</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.name} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <td className={classNameTd} style={{ padding: "10px", fontWeight: "700" }}>{col.name}</td>
              <td className={classNameTd} style={{ padding: "10px", fontFamily: "monospace" }}>{col.type}</td>
              <td className={classNameTd} style={{ padding: "10px" }}>
                {col.key && (
                  <span className={classNameBadge} style={{
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: col.key === "PK" ? "#e6f7ff" : col.key === "FK" ? "#f9f0ff" : "#f5f5f5",
                    color: col.key === "PK" ? "#0050b3" : col.key === "FK" ? "#531dab" : "#595959",
                    border: "1px solid",
                    borderColor: col.key === "PK" ? "#91d5ff" : col.key === "FK" ? "#d3adf7" : "#d9d9d9"
                  }}>
                    {col.key}
                  </span>
                )}
              </td>
              <td className={classNameTd} style={{ padding: "10px", color: "var(--color-text-body)" }}>{col.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
