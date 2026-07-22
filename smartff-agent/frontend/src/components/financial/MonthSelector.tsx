interface MonthSelectorProps {
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function MonthSelector({ selectedMonth, onSelectMonth }: MonthSelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {MONTHS.map((month) => {
        const active = month === selectedMonth;
        return (
          <button
            key={month}
            onClick={() => onSelectMonth(month)}
            style={{
              padding: '7px 14px',
              borderRadius: '20px',
              background: active ? '#2563EB' : '#FFFFFF',
              border: active ? 'none' : '1px solid #E2E8F0',
              color: active ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: active ? '700' : '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {month}월
          </button>
        );
      })}
    </div>
  );
}
