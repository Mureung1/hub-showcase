import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MarginWasteChartProps {
  data: any[];
  categories?: any[];
}

export default function MarginWasteChart({ data }: MarginWasteChartProps) {
  const categoryMap = new Map<string, { margin: number; waste: number }>();

  data.forEach((record) => {
    const key = record.category;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { margin: 0, waste: 0 });
    }
    const current = categoryMap.get(key)!;
    current.margin += record.margin_amount;
    current.waste += record.waste_amount;
  });

  const chartData = Array.from(categoryMap.entries()).map(([category, { margin, waste }]) => ({
    category,
    마진액: Math.round(margin / 1000000),
    폐기손실: Math.round(waste / 1000000),
  }));

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#475569' }} />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} label={{ value: '금액(백만원)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value: number) => `${value}M원`}
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend />
          <Bar dataKey="마진액" fill="#2563EB" />
          <Bar dataKey="폐기손실" fill="#FCA5A5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
