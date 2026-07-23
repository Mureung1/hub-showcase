function TaxiLoader({ label = "불러오는 중..." }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", height: 24, maxWidth: 160, margin: "0 auto 10px", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            borderTop: "2px dashed rgba(36,21,18,0.15)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            fontSize: 20,
            transform: "translateY(-50%)",
            animation: "taxi-drive 1.6s linear infinite",
          }}
        >
          🚕
        </span>
      </div>
      <p style={{ fontSize: 13, color: "#8A7A76", margin: 0 }}>{label}</p>
    </div>
  );
}

export default TaxiLoader;
