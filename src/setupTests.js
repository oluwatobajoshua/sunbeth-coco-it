// Jest setup for CRA tests
// 1) Extend Jest matchers
import '@testing-library/jest-dom';

// 2) Stub Canvas API used by chart.js to avoid jsdom errors
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    // minimal 2D context stub
    canvas: document.createElement('canvas'),
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  }),
});

// 3) Mock react-chartjs-2 components to simple stubs during tests
jest.mock('react-chartjs-2', () => ({
  Chart: () => null,
  Line: () => null,
  Bar: () => null,
  Doughnut: () => null,
}));
