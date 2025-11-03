import { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDemoData } from '../demo/DemoDataContext';

export const useIssueStats = (userEmail, stationId, sinceDays) => {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    resolutionRate: 0,
    byType: {},
    byPriority: { low: 0, medium: 0, high: 0 },
    trend7: [],
    trendTotal: 0,
    trendOpen: 0,
    trendInProgress: 0,
    trendResolved: 0,
    agingBuckets: { d0_2: 0, d3_7: 0, d8_14: 0, d15p: 0 },
    topStations: [],
  });
  const [loading, setLoading] = useState(true);

  const { enabled: demoOn, issues: demoIssues } = useDemoData();

  useEffect(() => {
    const run = async () => {
  if (demoOn) {
        // Local computation using demo dataset
        setLoading(true);
        try {
          const now = new Date();
          const sinceDate = (sinceDays && Number.isFinite(sinceDays))
            ? new Date(now.getTime() - sinceDays*24*3600*1000)
            : null;

          // Scope filters
          let list = demoIssues;
          if (userEmail) list = list.filter(it => it.reporterId === userEmail);
          if (stationId) list = list.filter(it => it.stationId === stationId);
          if (sinceDate) list = list.filter(it => it.createdAt >= sinceDate);

          const total = list.length;
          const open = list.filter(it => it.status === 'reported').length;
          const inProgress = list.filter(it => it.status === 'in-progress').length;
          const resolved = list.filter(it => it.status === 'resolved').length;
          const closed = list.filter(it => it.status === 'closed').length;
          const resolutionRate = total ? Math.round((resolved/total)*100) : 0;

          const types = ['electrical','mechanical','safety','equipment'];
          const byType = types.reduce((acc,t)=>{
            acc[t] = list.filter(it => it.issueType === t).length; return acc;
          }, {});

          const byPriority = ['low','medium','high'].reduce((acc,p)=>{
            acc[p] = list.filter(it => it.priority === p).length; return acc;
          }, { low:0, medium:0, high:0 });

          // Trend: last 7 days created
          const today = new Date();
          const days = [...Array(7)].map((_, i) => {
            const d = new Date(today); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i)); return d;
          });
          const trend7 = days.map((start, idx) => {
            const end = new Date(start); end.setDate(end.getDate()+1);
            return list.filter(it => it.createdAt >= start && it.createdAt < end).length;
          });

          // Aging buckets for open issues
          const b0 = new Date(now.getTime() - 2*24*3600*1000);
          const b1 = new Date(now.getTime() - 7*24*3600*1000);
          const b2 = new Date(now.getTime() - 14*24*3600*1000);
          const agingOpenStatuses = ['reported','in-progress','pending_approval'];
          const openList = list.filter(it => agingOpenStatuses.includes(it.status));
          const agingBuckets = {
            d0_2: openList.filter(it => it.createdAt >= b0).length,
            d3_7: openList.filter(it => it.createdAt >= b1 && it.createdAt < b0).length,
            d8_14: openList.filter(it => it.createdAt >= b2 && it.createdAt < b1).length,
            d15p: openList.filter(it => it.createdAt < b2).length,
          };

          // Top stations only for org scope (no userEmail)
          let topStations = [];
          if (!userEmail) {
            const byStation = {};
            openList.forEach(it => { byStation[it.stationId] = (byStation[it.stationId]||0)+1; });
            topStations = Object.entries(byStation).map(([stationId, count]) => ({ stationId, count }))
              .sort((a,b)=>b.count-a.count).slice(0,5);
          }

          setStats(s => ({
            ...s,
            total, open, inProgress, resolved, closed, resolutionRate,
            byType, byPriority, trend7, agingBuckets, topStations,
            trendTotal: 0, trendOpen: 0, trendInProgress: 0, trendResolved: 0,
          }));
        } catch (e) {
          setStats(s => ({ ...s }));
        } finally {
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const base = collection(db, 'issues');
        const now = new Date();
        let sinceDate = null;
        if (sinceDays && Number.isFinite(sinceDays)) {
          sinceDate = new Date(now);
          sinceDate.setDate(sinceDate.getDate() - sinceDays);
        }

        const qUser = (additional) => {
          const filters = [where('reporterId', '==', userEmail)];
          if (stationId) filters.push(where('stationId', '==', stationId));
          if (!userEmail) filters.splice(0, 1); // global scope
          if (sinceDate) filters.push(where('createdAt', '>=', sinceDate));
          return query(base, ...filters, ...(additional || []));
        };

        // Counts by status
        const [totalSnap, openSnap, inProgSnap, resolvedSnap, closedSnap] = await Promise.all([
          getCountFromServer(qUser()),
          getCountFromServer(qUser([where('status', '==', 'reported')])),
          getCountFromServer(qUser([where('status', '==', 'in-progress')])),
          getCountFromServer(qUser([where('status', '==', 'resolved')])),
          getCountFromServer(qUser([where('status', '==', 'closed')])),
        ]);

        const total = totalSnap.data().count;
        const open = openSnap.data().count;
        const inProgress = inProgSnap.data().count;
  const resolved = resolvedSnap.data().count;
  const closed = closedSnap.data().count;

        const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

        // Basic breakdown by common issue types
        const types = ['electrical', 'mechanical', 'safety', 'equipment'];
        const typeCountsEntries = await Promise.all(
          types.map(async (t) => {
            const snap = await getCountFromServer(qUser([where('issueType', '==', t)]));
            return [t, snap.data().count];
          })
        );
        const byType = Object.fromEntries(typeCountsEntries);

        // Priority distribution (all issues in scope)
        const priorities = ['low','medium','high'];
        const priorityEntries = await Promise.all(
          priorities.map(async (p) => {
            const snap = await getCountFromServer(qUser([where('priority', '==', p)]));
            return [p, snap.data().count];
          })
        );
        const byPriority = Object.fromEntries(priorityEntries);

        // Last 7 days trend for created issues
        const today = new Date();
        const days = [...Array(7)].map((_, i) => {
          const d = new Date(today);
          d.setHours(0,0,0,0);
          d.setDate(d.getDate() - (6 - i));
          return d;
        });
        const trendCounts = [];
        for (let i = 0; i < days.length; i++) {
          const start = days[i];
          const end = new Date(start); end.setDate(end.getDate() + 1);
          // Firestore count per day window
          const snap = await getCountFromServer(qUser([where('createdAt', '>=', start), where('createdAt', '<', end)]));
          trendCounts.push(snap.data().count);
        }

        // Aging buckets (open issues only)
  const openStatuses = ['reported','in-progress','pending_approval'];
        const b0 = new Date(now); b0.setDate(now.getDate() - 2);
        const b1 = new Date(now); b1.setDate(now.getDate() - 7);
        const b2 = new Date(now); b2.setDate(now.getDate() - 14);
        const [c0_2, c3_7, c8_14, c15p] = await Promise.all([
          getCountFromServer(qUser([where('status', 'in', openStatuses), where('createdAt', '>=', b0)])),
          getCountFromServer(qUser([where('status', 'in', openStatuses), where('createdAt', '>=', b1), where('createdAt', '<', b0)])),
          getCountFromServer(qUser([where('status', 'in', openStatuses), where('createdAt', '>=', b2), where('createdAt', '<', b1)])),
          getCountFromServer(qUser([where('status', 'in', openStatuses), where('createdAt', '<', b2)])),
        ]);
        const agingBuckets = {
          d0_2: c0_2.data().count,
          d3_7: c3_7.data().count,
          d8_14: c8_14.data().count,
          d15p: c15p.data().count,
        };

        // Top stations by open issues (exec/org scope only)
        let topStations = [];
        if (!userEmail) {
          const stationIds = ['coco-lagos-1','coco-abuja-1','coco-port-1','coco-kano-1','coco-ibadan-1'];
          const stationCounts = await Promise.all(
            stationIds.map(async (sid) => {
              const snap = await getCountFromServer(
                qUser([where('stationId','==',sid), where('status','in', openStatuses)])
              );
              return { stationId: sid, count: snap.data().count };
            })
          );
          topStations = stationCounts.sort((a,b)=>b.count-a.count).slice(0,5);
        }

        setStats((s) => ({
          ...s,
          total,
          open,
          inProgress,
          resolved,
          closed,
          resolutionRate,
          byType,
          byPriority,
          trend7: trendCounts,
          agingBuckets,
          topStations,
          // Placeholder trends (could be computed vs last period)
          trendTotal: 0,
          trendOpen: 0,
          trendInProgress: 0,
          trendResolved: 0,
        }));
      } catch (e) {
        // Silent fail to keep dashboard robust
        setStats((s) => ({ ...s }));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userEmail, stationId, sinceDays, demoOn, demoIssues]);

  return { stats, loading };
};