import { useState, useRef, useEffect } from 'react';

type UploadRecord = {
  id: string;
  category: string;
  filename: string;
  status: string;
  uploaded_at: string;
};

type UploadType = {
  id: string;
  name: string;
  category: 'sales' | 'orders' | 'waste' | 'inventory' | 'hourly' | 'weekday';
  usedIn: string[];
};

type UIState = {
  selectedFileName: string | null;
  isUploading: boolean;
  error: string | null;
  isDragging?: boolean;
};

const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];

function isValidFileType(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

const UPLOAD_TYPES: UploadType[] = [
  {
    id: 'sales',
    name: '판매 데이터',
    category: 'sales',
    usedIn: ['Dashboard', 'Financial'],
  },
  {
    id: 'orders',
    name: '발주 데이터',
    category: 'orders',
    usedIn: ['Dashboard'],
  },
  {
    id: 'waste',
    name: '폐기',
    category: 'waste',
    usedIn: ['Dashboard', 'Financial'],
  },
  {
    id: 'inventory',
    name: '재고',
    category: 'inventory',
    usedIn: ['Analysis'],
  },
  {
    id: 'hourly',
    name: '시간대별 매출',
    category: 'hourly',
    usedIn: ['Analysis'],
  },
  {
    id: 'weekday',
    name: '요일별 매출',
    category: 'weekday',
    usedIn: ['Analysis'],
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

const validationResults = [
  { name: '판매 데이터', status: '정상', count: '523개 상품 정상 인식' },
  { name: '발주 데이터', status: '정상', count: '113개 매칭 실패' },
  { name: '폐기', status: '정상', count: '85개 상품 정상 인식' },
  { name: '재고', status: '경고', count: '신규 5개 제품 신규' },
];

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uiState, setUiState] = useState<Record<string, UIState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const loadUploads = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${BASE_URL}/api/uploads`);
        const json = (await response.json()) as { success: boolean; data?: UploadRecord[]; error?: string };

        if (!json.success) {
          throw new Error(json.error || 'Failed to load uploads');
        }

        setUploads(json.data || []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load uploads');
        console.error('Error loading uploads:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUploads();
  }, []);

  const processSelectedFile = (id: string, file: File) => {
    if (!isValidFileType(file.name)) {
      setUiState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          error: `허용되는 파일 형식은 .xlsx, .csv입니다. (선택됨: ${file.name.substring(file.name.lastIndexOf('.'))})`,
          selectedFileName: null,
        },
      }));
      return;
    }

    setUiState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selectedFileName: file.name,
        error: null,
      },
    }));
  };

  const handleFileSelect = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processSelectedFile(id, file);
  };

  const handleClearFile = (id: string) => {
    setUiState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selectedFileName: null,
      },
    }));
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].value = '';
    }
  };

  const handleUploadClick = async (id: string) => {
    const uploadType = UPLOAD_TYPES.find((t) => t.id === id);
    if (!uploadType) return;

    const fileName = uiState[id]?.selectedFileName;
    if (!fileName) return;

    try {
      setUiState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isUploading: true,
          error: null,
        },
      }));

      const BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${BASE_URL}/api/uploads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: uploadType.category, filename: fileName }),
      });

      const json = (await response.json()) as { success: boolean; data?: UploadRecord; error?: string };

      if (!json.success) {
        throw new Error(json.error || 'Upload failed');
      }

      if (json.data) {
        setUploads((prev) => [json.data!, ...prev]);
      }

      setUiState((prev) => ({
        ...prev,
        [id]: {
          selectedFileName: null,
          isUploading: false,
          error: null,
        },
      }));
    } catch (err) {
      setUiState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isUploading: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        },
      }));
    }
  };

  const getLatestForCategory = (category: string): UploadRecord | null => {
    return uploads.find((u) => u.category === category) || null;
  };

  const handleDragOver = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUiState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isDragging: true,
      },
    }));
  };

  const handleDragLeave = (id: string) => {
    setUiState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isDragging: false,
      },
    }));
  };

  const handleDrop = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUiState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isDragging: false,
      },
    }));

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(id, file);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${BASE_URL}/api/uploads/${id}`, {
        method: 'DELETE',
      });

      const json = (await response.json()) as { success: boolean; error?: string };

      if (!json.success) {
        throw new Error(json.error || 'Delete failed');
      }

      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Delete failed:', err);
    }
  };

  const completeCount = UPLOAD_TYPES.filter((type) => getLatestForCategory(type.category)).length;
  const progressPercentage = Math.round((completeCount / UPLOAD_TYPES.length) * 100);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: colors.textSecondary }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', background: colors.bgPrimary, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: colors.textPrimary, margin: '0 0 4px 0' }}>업로드</h1>
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0' }}>
              <span style={{ color: colors.success, fontWeight: '600', marginRight: '4px' }}>●</span>
              GS25 강남역점 · 데이터 관리
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: progressPercentage === 100 ? colors.success : '#1D4ED8', padding: '7px 14px', background: progressPercentage === 100 ? colors.successTint : colors.primaryTint, borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: progressPercentage === 100 ? colors.success : colors.primary, flexShrink: 0 }} />
              {progressPercentage === 100 ? 'AI분석완료' : `AI분석준비중 · ${progressPercentage}%완성`}
            </div>
            <div style={{ fontSize: '12.5px', color: colors.textSecondary, padding: '7px 14px', background: '#F1F5F9', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div style={{
          background: colors.dangerTint,
          border: `1px solid ${colors.danger}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          color: colors.danger,
          fontSize: '13px',
        }}>
          ⚠ {loadError}
        </div>
      )}

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
          {UPLOAD_TYPES.length}개 데이터 중 {completeCount}개 준비
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UPLOAD_TYPES.map((type) => {
            const latest = getLatestForCategory(type.category);
            return (
              <span key={type.id} style={{ fontSize: '11px', fontWeight: '500' }}>
                {latest ? (
                  <span style={{ color: colors.success }}>✓ {type.name}</span>
                ) : (
                  <span style={{ color: colors.textTertiary }}>○ {type.name}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Section Title */}
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, margin: '0 0 16px 0' }}>데이터 업로드</h2>

      {/* Upload Cards Grid (3x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {UPLOAD_TYPES.map((type) => {
          const categoryStyle = categoryColors[type.category];
          const state = uiState[type.id] || { selectedFileName: null, isUploading: false, error: null };

          return (
            <div
              key={type.id}
              onDragOver={(e) => handleDragOver(type.id, e)}
              onDragLeave={() => handleDragLeave(type.id)}
              onDrop={(e) => handleDrop(type.id, e)}
              style={{
                background: categoryStyle.bg,
                border: `2px solid ${state.isDragging ? colors.primary : type.category === 'inventory' ? '#FDE68A' : colors.borderColor}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: state.isDragging ? `0 0 8px ${colors.primary}40` : '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.2s',
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
                  {type.name}
                </span>
              </div>

              <p style={{ fontSize: '11px', color: colors.textSecondary, margin: '0 0 12px 0' }}>
                {type.usedIn.join(' · ')}
              </p>

              <input
                type="file"
                ref={(el) => {
                  if (el) fileInputRefs.current[type.id] = el;
                }}
                onChange={(e) => handleFileSelect(type.id, e)}
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRefs.current[type.id]?.click()}
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

              {state.selectedFileName && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', color: colors.primary, fontWeight: '500', margin: '0' }}>
                      ✓ 선택된 파일: {state.selectedFileName}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleClearFile(type.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.textTertiary,
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '2px 6px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.color = colors.danger;
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.color = colors.textTertiary;
                      }}
                    >
                      ✕ 취소
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUploadClick(type.id)}
                    disabled={state.isUploading}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: state.isUploading ? colors.textTertiary : colors.primary,
                      color: colors.bgCard,
                      fontWeight: '600',
                      borderRadius: '6px',
                      cursor: state.isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      transition: 'background 0.2s',
                    }}
                  >
                    {state.isUploading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
              )}

              {state.error && (
                <p style={{ fontSize: '11px', color: colors.danger, margin: '0 0 8px 0' }}>
                  ✗ {state.error}
                </p>
              )}

              {(() => {
                const latest = getLatestForCategory(type.category);
                if (latest) {
                  return (
                    <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
                      최근 업로드 · {new Date(latest.uploaded_at).toLocaleDateString('ko-KR')}
                    </p>
                  );
                }
                return (
                  <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
                    최근 업로드 없음
                  </p>
                );
              })()}
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
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.borderColor}`, borderRadius: '12px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)', maxHeight: '320px', overflowY: 'auto' }}>
          {uploads.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: colors.textSecondary }}>
              업로드 이력이 없습니다.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${colors.borderColor}`, position: 'sticky', top: 0 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>날짜</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>파일명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>카테고리</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: colors.textPrimary }}>상태</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: colors.textPrimary }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((record) => {
                  const uploadType = UPLOAD_TYPES.find((t) => t.category === record.category);
                  return (
                    <tr key={record.id} style={{ borderTop: `1px solid ${colors.borderColor}` }}>
                      <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                        {new Date(record.uploaded_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.textPrimary, fontWeight: '500' }}>
                        {record.filename}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.textSecondary }}>
                        {uploadType?.name || record.category}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: colors.success, fontWeight: '600' }}>✓ 완료</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(record.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: colors.danger,
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget as HTMLButtonElement;
                            btn.style.background = colors.dangerTint;
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget as HTMLButtonElement;
                            btn.style.background = 'none';
                          }}
                        >
                          ✕ 삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ textAlign: 'right', paddingTop: '24px', borderTop: `1px solid ${colors.borderColor}` }}>
        <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
          데이터 기준일 · {uploads[0] ? new Date(uploads[0].uploaded_at).toLocaleDateString('ko-KR') : 'N/A'}
        </p>
      </div>
    </div>
  );
}
