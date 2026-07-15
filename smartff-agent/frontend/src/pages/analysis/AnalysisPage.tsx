const colors = {
  bgPrimary: '#F8FAFC',
  textSecondary: '#475569',
};

export default function AnalysisPage() {
  return (
    <div
      style={{
        padding: '32px',
        minHeight: '100vh',
        background: colors.bgPrimary,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
        분석
      </h1>
      <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0' }}>
        준비 중입니다...
      </p>
    </div>
  );
}
