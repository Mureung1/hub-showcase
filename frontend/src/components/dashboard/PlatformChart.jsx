import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { platformChartData } from '../../mocks/dashboardMock';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function PlatformChart() {
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
        display: false
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
      <h3 className="text-lg font-bold text-[#151D48] mb-6">플랫폼별 도달률 비교</h3>
      <div className="h-64">
        <Bar data={platformChartData} options={options} />
      </div>
    </div>
  );
}
