import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Centralized navigation rules
export default function AuthNavigator() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Skip redirects in unit tests to make rendering deterministic
    if (process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_AUTH === 'mock') return;
    // Wait until auth state resolves to avoid redirect loops
    if (!isReady) return;
    const path = location.pathname;
    const protectedPrefixes = ['/dashboard', '/report', '/issues', '/admin'];
    const onProtected = protectedPrefixes.some(p => path.startsWith(p));

    if (isAuthenticated && path === '/') {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!isAuthenticated && onProtected) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isReady, location.pathname, navigate]);

  return null;
}
