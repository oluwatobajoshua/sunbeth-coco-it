import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatusDonut = ({ open = 0, inProgress = 0, resolved = 0, closed = 0, title = 'Status Distribution' }) => {
  const colors = getColors();
  const data = useMemo(() => ({
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [
      {
        data: [open, inProgress, resolved, closed],
        backgroundColor: [colors.accent, colors.primaryLight, colors.primary, colors.closed],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }), [open, inProgress, resolved, closed, colors.accent, colors.primary, colors.primaryLight, colors.closed]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: colors.text } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
    },
    animation: { animateRotate: true, animateScale: true, duration: 900 },
    cutout: '60%',
  }), [colors.text]);

  return (
    <div>
      <div className="section-header" style={{marginBottom: 8}}>
        <h3 className="small">{title}</h3>
      </div>
      <div className="chart-container" style={{height: 280}}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

function getColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue('--primary').trim() || '#0c5343',
    primaryLight: styles.getPropertyValue('--primary-500').trim() || '#0a6b55',
    accent: styles.getPropertyValue('--accent').trim() || '#f64500',
    closed: styles.getPropertyValue('--gray-400').trim() || '#adb5bd',
    text: styles.getPropertyValue('--gray-700').trim() || '#343a40',
  };
}

export default StatusDonut;
