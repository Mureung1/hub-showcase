import { colorMap } from '../../mocks/dashboardMock';

export default function StatCard({ icon, value, label, color }) {
  const colors = colorMap[color] || colorMap.pink;

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${colors.bg}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-extrabold ${colors.text} mb-1`}>{value}</div>
      <div className="text-[#737791] text-sm">{label}</div>
    </div>
  );
}
