import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ORDER = ['electrical','mechanical','safety','equipment'];

const TypeBar = ({ byType = {}, title = 'Issues by Type' }) => {
  const colors = getColors();
  const labels = ORDER.map(k => k.charAt(0).toUpperCase()+k.slice(1));
  const values = ORDER.map(k => byType?.[k] || 0);
  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Issues',
        data: values,
        backgroundColor: colors.primary,
        borderRadius: 8,
        barThickness: 24,
        maxBarThickness: 28,
      },
    ],
  }), [labels, values, colors.primary]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: colors.text } },
      y: { ticks: { color: colors.text }, beginAtZero: true, grace: '10%' },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} issues` } },
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
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

export default TypeBar;
