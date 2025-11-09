import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Fetch active issue types for the public form
export async function getIssueTypes() {
  try {
    const col = collection(db, 'issueTypes');
    // Use a simple equality query to avoid requiring a composite index; sort client-side
    const q = query(col, where('active', '==', true));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return items.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
  } catch (_) {
    // return empty; seeder is responsible for initial data
    return [];
  }
}

export default getIssueTypes;
