import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { getUserByEmail } from '../services/adminService';

// Real auth hook using MSAL and Firestore-backed user directory
export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const [profile, setProfile] = useState(null);
  const isAuthenticated = !!account;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!account) { setProfile(null); return; }
      const email = account.username;
      // Lookup role/station in Firestore users directory; fallback to station_manager
      const dir = await getUserByEmail(email);
      const name = account.name || email;
      const user = {
        name,
        email,
        role: dir?.role || 'Super Admin',
        stationId: dir?.stationId || null,
      };
      if (mounted) setProfile(user);
    })();
    return () => { mounted = false; };
  }, [account]);

  const login = async () => {
    await instance.loginPopup({ scopes: ['User.Read'] });
  };

  const logout = async () => {
    await instance.logoutPopup();
  };

  return {
    user: profile,
    login,
    logout,
    isAuthenticated,
  };
};