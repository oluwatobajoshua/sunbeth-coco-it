const DEMO_KEY = 'sunbeth-demo-mode';

export const isDemoEnabled = () => {
  try {
    return localStorage.getItem(DEMO_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDemoEnabled = (enabled) => {
  try {
    localStorage.setItem(DEMO_KEY, enabled ? 'true' : 'false');
  } catch {}
};
