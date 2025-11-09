import { useState, useEffect, useCallback } from 'react';
import { getRecentIssues } from '../services/issueService';
import { collection, getDocs, limit as fsLimit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDemoData } from '../demo/DemoDataContext';

export const useRecentIssues = (userEmail, limitCount = 3, stationId) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enabled: demoOn, issues: demoIssues } = useDemoData();

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      if (demoOn) {
        let list = demoIssues;
        if (userEmail) list = list.filter(it => it.reporterId === userEmail);
        if (stationId) list = list.filter(it => it.stationId === stationId);
        list = [...list].sort((a,b)=> b.createdAt - a.createdAt).slice(0, limitCount);
        setIssues(list);
      } else {
        if (!userEmail) {
          // Org scope: fetch latest issues across reporters
          const constraints = [orderBy('createdAt', 'desc'), fsLimit(limitCount)];
          if (stationId) constraints.unshift(where('stationId', '==', stationId));
          const q = query(collection(db, 'issues'), ...constraints);
          const snap = await getDocs(q);
          const list = [];
          snap.forEach(doc => {
            const data = doc.data();
            list.push({ id: doc.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt });
          });
          setIssues(list);
        } else {
          const recentIssues = await getRecentIssues(userEmail, limitCount, stationId);
          setIssues(recentIssues);
        }
      }
      setError(null);
    } catch (err) {
      setError('Failed to load recent issues');
      console.error('Error loading recent issues:', err);
    } finally {
      setLoading(false);
    }
  }, [userEmail, limitCount, stationId, demoOn, demoIssues]);

  useEffect(() => {
    // In demo mode, allow queries without userEmail (org/demo scope)
    if (demoOn || userEmail) {
      loadIssues();
    }
  }, [userEmail, demoOn, loadIssues]);

  return {
    issues,
    loading,
    error,
    refetch: loadIssues
  };
};