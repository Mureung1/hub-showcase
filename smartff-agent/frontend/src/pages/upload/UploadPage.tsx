import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../../constants/analysisMockData';

const AUTOMATED_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

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
  // FF(신선식품)는 유통기한이 짧아 "재고" 개념 자체가 실사용과 안 맞아 보류 중 — 뒤에 ETL/파서가 없음
  disabled?: boolean;
};

type UIState = {
  selectedFileName: string | null;
  isUploading: boolean;
  error: string | null;
  info?: string | null;
  isDragging?: boolean;
  productCategory?: string;
  month?: number;
};

function isAutomatedType(category: UploadType['category']): boolean {
  return category === 'sales' || category === 'waste';
}

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
    disabled: true,
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

type ParseStat = {
  filename: string;
  total_rows: number;
  valid_rows: number;
  skipped_rows: number;
};

// 발주는 파서가 없어 실제 검증 통계를 낼 수 없음 — 있는 그대로 안내
const UNSUPPORTED_VALIDATION_NAMES = ['발주 데이터'];

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uiState, setUiState] = useState<Record<string, UIState>>({});
  // 이번 세션에서 업로드가 완료된 sales/waste의 최근 파싱 통계 (새로고침하면 사라짐 — 서버에 영속화하지 않음)
  const [parseStats, setParseStats] = useState<Record<'sales' | 'waste', ParseStat | null>>({
    sales: null,
    waste: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileObjectsRef = useRef<Record<string, File | null>>({});

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

    fileObjectsRef.current[id] = file;

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
    fileObjectsRef.current[id] = null;
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

  const handleProductCategoryChange = (id: string, productCategory: string) => {
    setUiState((prev) => ({
      ...prev,
      [id]: { ...prev[id], productCategory },
    }));
  };

  const handleMonthChange = (id: string, month: number) => {
    setUiState((prev) => ({
      ...prev,
      [id]: { ...prev[id], month },
    }));
  };

  const handleUploadClick = async (id: string) => {
    const uploadType = UPLOAD_TYPES.find((t) => t.id === id);
    if (!uploadType) return;

    const fileName = uiState[id]?.selectedFileName;
    if (!fileName) return;

    const automated = isAutomatedType(uploadType.category);
    const { productCategory, month } = uiState[id] || {};

    if (automated && (!productCategory || !month)) {
      setUiState((prev) => ({
        ...prev,
        [id]: { ...prev[id], error: '카테고리와 월을 선택해주세요.' },
      }));
      return;
    }

    try {
      setUiState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isUploading: true,
          error: null,
          info: null,
        },
      }));

      const BASE_URL = import.meta.env.VITE_API_BASE_URL;

      let response: Response;
      if (automated) {
        const file = fileObjectsRef.current[id];
        const formData = new FormData();
        formData.append('file', file as File);
        formData.append('category', uploadType.category);
        formData.append('productCategory', productCategory as string);
        formData.append('month', String(month));

        response = await fetch(`${BASE_URL}/api/uploads`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`${BASE_URL}/api/uploads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ category: uploadType.category, filename: fileName }),
        });
      }

      const json = (await response.json()) as {
        success: boolean;
        data?: UploadRecord;
        error?: string;
        missingFiles?: string[];
        parseStats?: ParseStat;
      };

      if (response.status === 202) {
        if (json.data) {
          setUploads((prev) => [json.data!, ...prev]);
        }
        if (json.parseStats && (uploadType.category === 'sales' || uploadType.category === 'waste')) {
          setParseStats((prev) => ({ ...prev, [uploadType.category]: json.parseStats! }));
        }
        fileObjectsRef.current[id] = null;
        setUiState((prev) => ({
          ...prev,
          [id]: {
            selectedFileName: null,
            isUploading: false,
            error: null,
            info: `${month}월 데이터 대기 중입니다. 아직 필요한 파일: ${(json.missingFiles || []).join(', ')}`,
          },
        }));
        return;
      }

      if (!json.success) {
        throw new Error(json.error || 'Upload failed');
      }

      if (json.data) {
        setUploads((prev) => [json.data!, ...prev]);
      }

      if (json.parseStats && (uploadType.category === 'sales' || uploadType.category === 'waste')) {
        setParseStats((prev) => ({ ...prev, [uploadType.category]: json.parseStats! }));
      }

      fileObjectsRef.current[id] = null;
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

  const activeUploadTypes = UPLOAD_TYPES.filter((type) => !type.disabled);
  const completeCount = activeUploadTypes.filter((type) => getLatestForCategory(type.category)).length;
  const progressPercentage = Math.round((completeCount / activeUploadTypes.length) * 100);

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
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.textPrimary, margin: '0 0 4px 0' }}>업로드</h1>
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0' }}>
              <span style={{ color: colors.success, fontWeight: '600', marginRight: '4px' }}>●</span>
              GS25 강남역점 · 데이터 관리
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '5px 10px', background: progressPercentage === 100 ? colors.successTint : colors.primaryTint, color: progressPercentage === 100 ? colors.success : colors.primary, fontSize: '11px', fontWeight: '600', borderRadius: '9999px' }}>
              {progressPercentage === 100 ? 'AI분석완료' : `AI분석준비중 · ${progressPercentage}%완성`}
            </span>
            <span style={{ padding: '5px 10px', background: colors.bgCard, color: colors.textSecondary, fontSize: '11px', fontWeight: '600', borderRadius: '9999px', border: `1px solid ${colors.borderColor}` }}>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
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
          {activeUploadTypes.length}개 데이터 중 {completeCount}개 준비
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {activeUploadTypes.map((type) => {
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

          if (type.disabled) {
            return (
              <div
                key={type.id}
                style={{
                  background: colors.bgPrimary,
                  border: `2px dashed ${colors.borderColor}`,
                  borderRadius: '12px',
                  padding: '20px',
                  opacity: 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: colors.textTertiary,
                    }}></span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>
                      {type.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: colors.textTertiary, background: colors.bgCard, padding: '2px 8px', borderRadius: '9999px' }}>
                    준비 중
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: colors.textTertiary, margin: '0' }}>
                  FF 상품은 유통기한이 짧아 재고 분석 지표가 아직 지원되지 않습니다.
                </p>
              </div>
            );
          }

          return (
            <div
              key={type.id}
              onDragOver={(e) => handleDragOver(type.id, e)}
              onDragLeave={() => handleDragLeave(type.id)}
              onDrop={(e) => handleDrop(type.id, e)}
              style={{
                background: categoryStyle.bg,
                border: `2px solid ${state.isDragging ? colors.primary : colors.borderColor}`,
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

                  {isAutomatedType(type.category) && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <select
                        value={state.productCategory || ''}
                        onChange={(e) => handleProductCategoryChange(type.id, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '11px',
                          border: `1px solid ${colors.borderColor}`,
                          borderRadius: '6px',
                          color: colors.textPrimary,
                          background: colors.bgCard,
                        }}
                      >
                        <option value="">카테고리 선택</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        value={state.month ?? ''}
                        onChange={(e) => handleMonthChange(type.id, Number(e.target.value))}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '11px',
                          border: `1px solid ${colors.borderColor}`,
                          borderRadius: '6px',
                          color: colors.textPrimary,
                          background: colors.bgCard,
                        }}
                      >
                        <option value="">월 선택</option>
                        {AUTOMATED_MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}월
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleUploadClick(type.id)}
                    disabled={state.isUploading || (isAutomatedType(type.category) && (!state.productCategory || !state.month))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background:
                        state.isUploading || (isAutomatedType(type.category) && (!state.productCategory || !state.month))
                          ? colors.textTertiary
                          : colors.primary,
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

              {state.info && (
                <p style={{ fontSize: '11px', color: colors.primary, margin: '0 0 8px 0' }}>
                  ⏳ {state.info}
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
          {(
            [
              { name: '판매 데이터', kind: 'sales' as const },
              { name: '발주 데이터', kind: null },
              { name: '폐기', kind: 'waste' as const },
            ] as { name: string; kind: 'sales' | 'waste' | null }[]
          ).map((row) => {
            const stat = row.kind ? parseStats[row.kind] : null;
            const isUnsupported = UNSUPPORTED_VALIDATION_NAMES.includes(row.name);
            // 인식된 상품이 하나도 없으면(양식이 다르거나 손상된 파일) 성공이 아니라 경고로 표시
            const hasSkipped = stat ? stat.skipped_rows > 0 || stat.valid_rows === 0 : false;

            return (
              <div
                key={row.name}
                style={{
                  background: colors.bgCard,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {!isUnsupported && stat && (
                    <span style={{ color: hasSkipped ? colors.warning : colors.success, fontWeight: '600' }}>
                      {hasSkipped ? '⚠' : '✓'}
                    </span>
                  )}
                  <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>
                    {row.name}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '0' }}>
                  {isUnsupported
                    ? '자동 검증 미지원 (파서 없음)'
                    : stat
                      ? stat.valid_rows === 0
                        ? `${stat.filename}: 인식된 상품이 없습니다. 파일 양식을 확인하세요.`
                        : `${stat.filename}: ${stat.valid_rows}개 상품 정상 인식${stat.skipped_rows > 0 ? `, ${stat.skipped_rows}개 실패` : ''}`
                      : '이번 세션에 업로드된 데이터가 없습니다.'}
                </p>
              </div>
            );
          })}
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
