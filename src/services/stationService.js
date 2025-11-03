import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

// Fetch stations for dynamic dropdowns
export async function getStations() {
  try {
    const q = query(collection(db, 'stations'), orderBy('name'));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list;
  } catch (_) {
    // ignore and return empty; app startup seeder is responsible for populating defaults
  }
  return [];
}
