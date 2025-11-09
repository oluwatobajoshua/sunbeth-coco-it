import React from 'react';
import { useAuth } from '../hooks/useAuth';

// AuthNavigator previously handled silent MSAL redirect completion and auto-login.
// In the simplified free-tier setup (no custom token bridge), we only ensure the
// component mounts cleanly without side effects. Future enhancements (e.g. auto
// redirect when unauthenticated) can be re-added here.
export default function AuthNavigator() {
	// Expose auth readiness for potential future logic (kept for compatibility)
	const { isReady } = useAuth();
	// No-op render: tests expect this component to exist but do not rely on behavior.
	return isReady ? null : null;
}

// Additional components or exports can follow here

