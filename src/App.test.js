import { render, screen } from '@testing-library/react';
import App from './App';

test('renders COCO Issue Tracker', () => {
  render(<App />);
  const headerElement = screen.getByText(/COCO Issue Tracker/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders Sunbeth Energies branding', () => {
  render(<App />);
  const brandingElement = screen.getByText(/by Sunbeth Energies/i);
  expect(brandingElement).toBeInTheDocument();
});

test('renders issue form when authenticated', () => {
  render(<App />);
  // Since we have mock auth that returns a user, the form should be visible
  const formElement = screen.getByText(/New Issue Report/i);
  expect(formElement).toBeInTheDocument();
});