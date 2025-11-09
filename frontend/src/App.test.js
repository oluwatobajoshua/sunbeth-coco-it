import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing hero title', () => {
  render(<App />);
  const hero = screen.getByText(/Sunbeth COCO Issue Tracker/i);
  expect(hero).toBeInTheDocument();
});

test('renders Sunbeth Energies branding', () => {
  render(<App />);
  const brandingElement = screen.getByText(/by Sunbeth Energies/i);
  expect(brandingElement).toBeInTheDocument();
});

test('renders dashboard when navigating to /dashboard', () => {
  // Simulate navigation to /dashboard
  window.history.pushState({}, 'Dashboard', '/dashboard');
  render(<App />);
  const kpi = screen.getByText(/COCO Station Dashboard/i);
  expect(kpi).toBeInTheDocument();
});