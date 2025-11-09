import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AgingBar = ({ buckets = { d0_2:0, d3_7:0, d8_14:0, d15p:0 }, title = 'Open Issues Aging' }) => {
  const colors = getColors();
  const data = useMemo(() => ({
    labels: ['0-2 days','3-7','8-14','15+'],
    datasets: [
      {
        label: 'Open',
        data: [buckets.d0_2||0, buckets.d3_7||0, buckets.d8_14||0, buckets.d15p||0],
        backgroundColor: colors.accent,
        borderRadius: 8,
        barThickness: 24,
        maxBarThickness: 28,
      },
    ],
  }), [buckets.d0_2, buckets.d3_7, buckets.d8_14, buckets.d15p, colors.accent]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: colors.text } },
      y: { ticks: { color: colors.text }, beginAtZero: true, grace: '10%' },
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
    accent: styles.getPropertyValue('--accent').trim() || '#f64500',
    text: styles.getPropertyValue('--gray-700').trim() || '#343a40',
  };
}

export default AgingBar;
