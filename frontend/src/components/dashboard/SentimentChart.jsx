import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { sentimentChartData } from '../../mocks/dashboardMock';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SentimentChart() {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 16
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="text-lg font-bold text-[#151D48] mb-6">시청자 감정 분석 (KoBERT)</h3>
      <div className="h-64">
        <Doughnut data={sentimentChartData} options={options} />
      </div>
    </div>
  );
}
