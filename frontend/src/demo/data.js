// Sample demo data to showcase dashboard visuals
// You can toggle demo mode from Admin to switch between Firestore and this mock dataset

export const demoIssues = [
  // A mix of stations, priorities, statuses, and dates (last ~45 days)
  // Each item approximates the Firestore structure used in the app
  {
    id: 'COCO-2025-101', stationId: 'coco-lagos-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'electrical', priority: 'high', status: 'reported',
    description: 'Power surge affecting pumps #2 and #3',
    createdAt: new Date(Date.now() - 2*24*3600*1000),
  },
  {
    id: 'COCO-2025-102', stationId: 'coco-abuja-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'mechanical', priority: 'medium', status: 'in-progress',
    description: 'Nozzle calibration drift on dispenser 4',
    createdAt: new Date(Date.now() - 5*24*3600*1000),
  },
  {
    id: 'COCO-2025-103', stationId: 'coco-port-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'safety', priority: 'high', status: 'resolved',
    description: 'Slip hazard near entrance resolved by adding mats',
    createdAt: new Date(Date.now() - 9*24*3600*1000),
    resolvedAt: new Date(Date.now() - 7*24*3600*1000),
  },
  {
    id: 'COCO-2025-104', stationId: 'coco-kano-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'equipment', priority: 'low', status: 'reported',
    description: 'Printer paper jam at receipts station',
    createdAt: new Date(Date.now() - 1*24*3600*1000),
  },
  {
    id: 'COCO-2025-105', stationId: 'coco-ibadan-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'electrical', priority: 'medium', status: 'resolved',
    description: 'Lighting fault in canopy fixed by contractor',
    createdAt: new Date(Date.now() - 20*24*3600*1000),
    resolvedAt: new Date(Date.now() - 17*24*3600*1000),
  },
];

// expand synthetic dataset for stronger visuals
for (let i = 0; i < 35; i++) {
  const stations = ['coco-lagos-1','coco-abuja-1','coco-port-1','coco-kano-1','coco-ibadan-1'];
  const types = ['electrical','mechanical','safety','equipment'];
  const priorities = ['low','medium','high'];
  const statuses = ['reported','in-progress','resolved'];
  const stationId = stations[Math.floor(Math.random()*stations.length)];
  const issueType = types[Math.floor(Math.random()*types.length)];
  const priority = priorities[Math.floor(Math.random()*priorities.length)];
  const status = statuses[Math.floor(Math.random()*statuses.length)];
  const daysAgo = Math.floor(Math.random()*45);
  const createdAt = new Date(Date.now() - daysAgo*24*3600*1000);
  let resolvedAt;
  if (status === 'resolved') {
    const resolveLag = Math.floor(Math.random()*7)+1; // 1-7 days after created
    resolvedAt = new Date(createdAt.getTime() + resolveLag*24*3600*1000);
  }
  demoIssues.push({
    id: `COCO-2025-${200+i}`,
    stationId,
    reporterId: 'john.manager@cocostation.com',
    issueType,
    priority,
    status,
    description: `${issueType} issue (${priority}) at ${stationId}`,
    createdAt,
    ...(resolvedAt ? { resolvedAt } : {})
  });
}
