import { useState, useRef } from 'react';

type Upload = {
  id: string;
  name: string;
  category: 'sales' | 'orders' | 'waste' | 'inventory' | 'hourly' | 'weekday';
  status: '정상' | '경고' | '미업로드';
  lastUploadDate: string | null;
  monthCategory: string; // "06월 김밥" 형식
  usedIn: string[];
  selectedFileName: string | null;
  isUploading: boolean;
};

const MOCK_UPLOADS: Upload[] = [
  {
    id: 'sales',
    name: '판매 데이터',
    category: 'sales',
    status: '정상',
    lastUploadDate: '2026.07.08',
    monthCategory: '김밥 (6월)',
    usedIn: ['Dashboard', 'Financial'],
    selectedFileName: null,
    isUploading: false,
  },
  {
    id: 'orders',
    name: '발주 데이터',
    category: 'orders',
    status: '정상',
    lastUploadDate: '2026.07.05',
    monthCategory: '도시락 (6월)',
    usedIn: ['Dashboard'],
    selectedFileName: null,
    isUploading: false,
  },
  {
    id: 'waste',
    name: '폐기',
    category: 'waste',
    status: '정상',
    lastUploadDate: '2026.07.08',
    monthCategory: '주먹밥 (5월)',
    usedIn: ['Dashboard', 'Financial'],
    selectedFileName: null,
    isUploading: false,
  },
  {
    id: 'inventory',
    name: '재고',
    category: 'inventory',
    status: '경고',
    lastUploadDate: null,
    monthCategory: '햄버거샌드위치 (6월)',
    usedIn: ['Analysis'],
    selectedFileName: null,
    isUploading: false,
  },
  {
    id: 'hourly',
    name: '시간대별 매출',
    category: 'hourly',
    status: '미업로드',
    lastUploadDate: null,
    monthCategory: '김밥 (6월)',
    usedIn: ['Analysis'],
    selectedFileName: null,
    isUploading: false,
  },
  {
    id: 'weekday',
    name: '요일별 매출',
    category: 'weekday',
    status: '미업로드',
    lastUploadDate: null,
    monthCategory: '도시락 (6월)',
    usedIn: ['Analysis'],
    selectedFileName: null,
    isUploading: false,
  },
];

// Design System Colors
const colors = {
  primary: '#2563EB',
  primaryTint: '#EFF6FF',
  success: '#15803D',
  successTint: '#F0FDF4',
  danger: '#DC2626',
  dangerTint: '#FEF2F2',
  warning: '#B45309',
  warningTint: '#FFFBEB',
  bgPrimary: '#F8FAFC',
  bgCard: '#FFFFFF',
  borderColor: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
};

const categoryColors: Record<string, { bg: string; icon: string; iconBg: string }> = {
  sales: { bg: colors.primaryTint, icon: '●', iconBg: colors.primary },
  orders: { bg: colors.successTint, icon: '●', iconBg: colors.success },
  waste: { bg: colors.dangerTint, icon: '●', iconBg: colors.danger },
  inventory: { bg: colors.warningTint, icon: '●', iconBg: colors.warning },
  hourly: { bg: colors.bgCard, icon: '●', iconBg: colors.textTertiary },
  weekday: { bg: colors.bgCard, icon: '●', iconBg: colors.textTertiary },
};

export default function UploadPage() {
  const [uploads, setUploads] = useState<Upload[]>(MOCK_UPLOADS);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploads((prevUploads) =>
      prevUploads.map((upload) =>
        upload.id === id
          ? {
              ...upload,
              selectedFileName: file.name,
            }
          : upload
      )
    );
  };

  const handleUploadClick = (id: string) => {
    setUploads((prevUploads) =>
      prevUploads.map((upload) =>
        upload.id === id
          ? {
              ...upload,
              isUploading: true,
            }
          : upload
      )
    );

    // Mock upload: 500ms delay
    setTimeout(() => {
      setUploads((prevUploads) =>
        prevUploads.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                isUploading: false,
                status: '정상',
                lastUploadDate: '2026.07.14',
              }
            : upload
        )
      );
    }, 500);
  };

  // 파생 데이터
  const completeCount = uploads.filter((u) => u.status === '정상').length;
  const progressPercentage = Math.round((completeCount / uploads.length) * 100);

  // 검증 결과 (Mock)
  const validationResults = [
    { name: '판매 데이터', status: '정상', count: '523개 상품 정상 인식' },
    { name: '발주 데이터', status: '정상', count: '113개 매칭 실패' },
    { name: '폐기', status: '정상', count: '85개 상품 정상 인식' },
    { name: '재고', status: '경고', count: '신규 5개 제품 신규' },
  ];

  return (
    <div style={{ padding: '32px', background: colors.bgPrimary, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.textPrimary, margin: '0 0 4px 0' }}>업로드</h1>
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0' }}>
              <span style={{ color: colors.success, fontWeight: '600', marginRight: '4px' }}>●</span>
              GS25 강남역점 · 데이터 관리
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '5px 10px', background: colors.primaryTint, color: colors.primary, fontSize: '11px', fontWeight: '600', borderRadius: '9999px' }}>
              AI분석준비중 · 98%완성
            </span>
            <span style={{ padding: '5px 10px', background: colors.bgCard, color: colors.textSecondary, fontSize: '11px', fontWeight: '600', borderRadius: '9999px', border: `1px solid ${colors.borderColor}` }}>
              2026년 7월 9일 (목)
            </span>
          </div>
        </div>
      </div>

      {/* AI 분석 가능 여부 카드 */}
      <div style={{
        background: colors.primaryTint,
        border: `1px solid #DBEAFE`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, margin: '0' }}>AI 분석 가능 여부</h2>
          <span style={{ fontSize: '20px', fontWeight: '700', color: colors.primary }}>{progressPercentage}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: '#DBEAFE',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}>
          <div
            style={{
              height: '100%',
              background: colors.primary,
              width: `${progressPercentage}%`,
              transition: 'width 0.3s ease',
            }}
          ></div>
        </div>
        <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '0 0 8px 0' }}>
          {completeCount}개 데이터 중 {completeCount}개 준비
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {uploads.map((upload) => (
            <span key={upload.id} style={{ fontSize: '11px', fontWeight: '500' }}>
              {upload.status === '정상' && (
                <span style={{ color: colors.success }}>✓ {upload.name}</span>
              )}
              {upload.status === '경고' && (
                <span style={{ color: colors.warning }}>⚠ {upload.name}</span>
              )}
              {upload.status === '미업로드' && (
                <span style={{ color: colors.textTertiary }}>○ {upload.name}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Section Title */}
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, margin: '0 0 16px 0' }}>데이터 업로드</h2>

      {/* Upload Cards Grid (3x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {uploads.map((upload) => {
          const categoryStyle = categoryColors[upload.category];
          return (
            <div
              key={upload.id}
              style={{
                background: categoryStyle.bg,
                border: `1px solid ${upload.category === 'inventory' ? '#FDE68A' : colors.borderColor}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: categoryStyle.iconBg,
                }}></span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>
                  {upload.name}
                </span>
              </div>

              <p style={{ fontSize: '11px', color: colors.textSecondary, margin: '0 0 12px 0' }}>
                {upload.usedIn.join(' · ')}
              </p>

              <input
                type="file"
                ref={(el) => {
                  if (el) fileInputRefs.current[upload.id] = el;
                }}
                onChange={(e) => handleFileSelect(upload.id, e)}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRefs.current[upload.id]?.click()}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px dashed ${colors.borderColor}`,
                  background: colors.bgCard,
                  color: colors.textSecondary,
                  fontWeight: '500',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = colors.primary;
                  btn.style.color = colors.primary;
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = colors.borderColor;
                  btn.style.color = colors.textSecondary;
                }}
              >
                파일 선택
              </button>

              {upload.selectedFileName && (
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', color: colors.primary, fontWeight: '500', margin: '0 0 8px 0' }}>
                    ✓ 선택된 파일: {upload.selectedFileName}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleUploadClick(upload.id)}
                    disabled={upload.isUploading}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: upload.isUploading ? colors.textTertiary : colors.primary,
                      color: colors.bgCard,
                      fontWeight: '600',
                      borderRadius: '6px',
                      cursor: upload.isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      transition: 'background 0.2s',
                    }}
                  >
                    {upload.isUploading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
              )}

              <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
                {upload.lastUploadDate ? `최근 업로드 · ${upload.lastUploadDate}` : '최근 업로드 없음'}
              </p>
            </div>
          );
        })}
      </div>

      {/* 데이터 검증 결과 */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, margin: '0 0 16px 0' }}>데이터 검증 결과</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {validationResults.map((result, idx) => (
            <div
              key={idx}
              style={{
                background: colors.bgCard,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {result.status === '정상' && (
                  <span style={{ color: colors.success, fontWeight: '600' }}>✓</span>
                )}
                {result.status === '경고' && (
                  <span style={{ color: colors.warning, fontWeight: '600' }}>⚠</span>
                )}
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>
                  {result.name}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '0' }}>
                {result.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 업로드 이력 */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, margin: '0 0 16px 0' }}>최근 업로드 이력</h2>
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.borderColor}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${colors.borderColor}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>날짜</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>종류</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>카테고리</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {uploads
                .filter((u) => u.lastUploadDate !== null)
                .map((upload, idx) => (
                  <tr key={idx} style={{ borderTop: `1px solid ${colors.borderColor}` }}>
                    <td style={{ padding: '12px 16px', color: colors.textSecondary }}>{upload.lastUploadDate}</td>
                    <td style={{ padding: '12px 16px', color: colors.textPrimary, fontWeight: '500' }}>{upload.name}</td>
                    <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                      {upload.monthCategory}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {upload.status === '정상' && (
                        <span style={{ color: colors.success, fontWeight: '600' }}>✓ 완료</span>
                      )}
                      {upload.status === '경고' && (
                        <span style={{ color: colors.warning, fontWeight: '600' }}>⚠ 주의</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ textAlign: 'right', paddingTop: '24px', borderTop: `1px solid ${colors.borderColor}` }}>
        <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
          데이터 기준일 · 판매·발주·폐기 2026.07.08
        </p>
      </div>
    </div>
  );
}
