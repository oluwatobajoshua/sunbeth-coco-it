import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getStationName } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TopStationsBar = ({ items = [], title = 'Top Stations (Open Issues)' }) => {
  const colors = getColors();
  const labels = items.map(i => getStationName(i.stationId));
  const values = items.map(i => i.count);
  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Open',
        data: values,
        backgroundColor: colors.primary,
        borderRadius: 8,
      },
    ],
  }), [labels, values, colors.primary]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { ticks: { color: colors.text }, beginAtZero: true, grace: '10%' },
      y: { ticks: { color: colors.text } },
    },
    plugins: { legend: { display: false } },
    animation: { duration: 800 },
  }), [colors.text]);

  return (
    <div>
      <div className="section-header" style={{marginBottom: 8}}>
        <h3 className="small">{title}</h3>
      </div>
      <div className="chart-container" style={{height: 280}}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

function getColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue('--primary').trim() || '#0c5343',
    text: styles.getPropertyValue('--gray-700').trim() || '#343a40',
  };
}

export default TopStationsBar;
