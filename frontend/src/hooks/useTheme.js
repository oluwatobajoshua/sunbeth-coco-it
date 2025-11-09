import { useEffect, useState, useCallback } from 'react';

const THEME_KEY = 'sunbeth-theme';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    return stored || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggle };
};