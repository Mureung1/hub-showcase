function StepHeader({ step, avatarUrl, onProfileClick }) { // 로고 + "RideSplit" + 진행 도트 5개 + 내 프로필 버튼
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#C8102E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <circle cx="8" cy="10" r="6" fill="#fff" opacity="0.9" />
            <circle cx="15" cy="10" r="6" fill="#fff" opacity="0.55" />
            <circle cx="17.5" cy="17.5" r="5.5" fill="#fff" />
            <text x="17.5" y="20.3" fontSize="7" fontWeight="800" textAnchor="middle" fill="#8C0E22">
              ₩
            </text>
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>RideSplit</span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === step ? "#C8102E" : "rgba(36,21,18,0.15)",
                transition: "width 0.2s",
              }}
            />
          ))}
        </div>

        {onProfileClick && (
          <button
            onClick={onProfileClick}
            aria-label="내 프로필"
            style={{ border: "none", background: "none", padding: 0, cursor: "pointer", borderRadius: "50%", lineHeight: 0 }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#EFE7E3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                👤
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default StepHeader;
