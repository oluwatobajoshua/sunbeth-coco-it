import React, { createContext, useContext, useMemo } from 'react';
import { isDemoEnabled } from '../utils/featureFlags';
import { demoIssues } from './data';

const DemoDataContext = createContext({ enabled: false, issues: [] });

export const DemoDataProvider = ({ children }) => {
  const enabled = isDemoEnabled();

  const issues = useMemo(() => {
    if (!enabled) return [];
    // normalize dates to timestamps to mirror Firestore .toDate behavior
    return demoIssues.map(it => ({
      ...it,
      createdAt: it.createdAt instanceof Date ? it.createdAt : new Date(it.createdAt),
      resolvedAt: it.resolvedAt ? (it.resolvedAt instanceof Date ? it.resolvedAt : new Date(it.resolvedAt)) : undefined,
    }));
  }, [enabled]);

  const value = useMemo(() => ({ enabled, issues }), [enabled, issues]);
  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
};

export const useDemoData = () => useContext(DemoDataContext);
