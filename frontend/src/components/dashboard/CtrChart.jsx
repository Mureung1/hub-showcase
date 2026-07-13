import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ctrChartData } from '../../mocks/dashboardMock';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function CtrChart() {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          borderDash: [4, 4],
          color: '#F1F3F9'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="text-lg font-bold text-[#151D48] mb-6">목적지 클릭률(CTR) 및 조회수 추이</h3>
      <div className="h-80">
        <Bar data={ctrChartData} options={options} />
      </div>
    </div>
  );
}
