import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const TrendLine = ({ points = [], title = 'Last 7 Days - Created' }) => {
  const colors = getColors();
  const labels = useMemo(() => {
    const now = new Date();
    return points.map((_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (points.length - 1 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }, [points]);

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Issues Created',
        data: points,
        borderColor: colors.primary,
        backgroundColor: withAlpha(colors.primary, 0.2),
        tension: 0.35,
        pointRadius: 3,
        fill: true,
      },
    ],
  }), [labels, points, colors.primary]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: colors.text } },
      y: { ticks: { color: colors.text }, beginAtZero: true, grace: '10%' },
    },
    animation: { duration: 900, easing: 'easeOutCubic' },
  }), [colors.text]);

  return (
    <div>
      <div className="section-header" style={{marginBottom: 8}}>
        <h3 className="small">{title}</h3>
      </div>
      <div className="chart-container" style={{height: 280}}>
        <Line data={data} options={options} />
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

function withAlpha(hex, alpha) {
  // fallback for CSS var or hex; if rgb string, return rgba
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  // assume #rrggbb
  const c = hex.replace('#','');
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default TrendLine;
