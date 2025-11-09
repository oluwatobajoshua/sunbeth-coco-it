import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const PriorityDonut = ({ low = 0, medium = 0, high = 0, title = 'Priority Mix' }) => {
  const colors = getColors();
  const data = useMemo(() => ({
    labels: ['Low', 'Medium', 'High'],
    datasets: [
      {
        data: [low, medium, high],
        backgroundColor: [colors.low, colors.medium, colors.high],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }), [low, medium, high, colors.low, colors.medium, colors.high]);

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
    low: styles.getPropertyValue('--gray-300').trim() || '#ced4da',
    medium: styles.getPropertyValue('--accent').trim() || '#f64500',
    high: styles.getPropertyValue('--danger-color').trim() || '#dc3545',
    text: styles.getPropertyValue('--gray-700').trim() || '#343a40',
  };
}

export default PriorityDonut;
