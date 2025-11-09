import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';

// Centralized options used by lists/dropdowns across the app
// Stored at settings/options to keep with other app settings
export const OPTIONS_DOC_PATH = ['settings', 'options'];

export const DEFAULT_OPTIONS = {
  // Priorities drive UI and SLA math; include labels/descriptions for UX
  priorities: [
    { value: 'low', label: 'Low Priority', desc: 'Can wait for regular maintenance' },
    { value: 'medium', label: 'Medium Priority', desc: 'Should be addressed within 24 hours' },
    { value: 'high', label: 'High Priority', desc: 'Urgent - affects operations' },
  ],
  // Allowed status values for filtering and workflow
  statuses: ['reported','in-progress','resolved','pending_approval','closed'],
};

const getOptionsRef = () => doc(db, OPTIONS_DOC_PATH[0], OPTIONS_DOC_PATH[1]);

export async function getOptions() {
  try {
    const snap = await getDoc(getOptionsRef());
    if (snap.exists()) {
      return snap.data();
    }
  } catch (_) { /* ignore and fallback */ }
  // Fallback to defaults if not present; caller may trigger seeding
  return DEFAULT_OPTIONS;
}

// Idempotent: writes defaults only if the options doc does not exist yet
export async function ensureSeededOptions() {
  try {
    const ref = getOptionsRef();
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { ...DEFAULT_OPTIONS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  } catch (_) {
    // Permission denied is expected for non-admins; swallow
  }
}

// Generic helper to check if a collection is empty without reading all docs
async function isCollectionEmpty(path) {
  try {
    const q = query(collection(db, path), limit(1));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (_) { return false; }
}

// Seed commonly used lookup collections with a small default set, only if empty
export async function seedLookupCollectionsIfEmpty() {
  // Stations
  try {
    if (await isCollectionEmpty('stations')) {
      const stations = [
        { id: 'coco-lagos-1', name: 'COCO Lagos Central' },
        { id: 'coco-abuja-1', name: 'COCO Abuja Main' },
        { id: 'coco-port-1', name: 'COCO Port Harcourt' },
      ];
      for (const s of stations) {
        // Use deterministic IDs when possible
        await setDoc(doc(db, 'stations', s.id), { name: s.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
  } catch (_) { /* ignore permission issues */ }

  // Issue Types
  try {
    if (await isCollectionEmpty('issueTypes')) {
      const issueTypes = [
        { id: 'electrical', key: 'electrical', label: 'Electrical', icon: 'bolt', active: true },
        { id: 'mechanical', key: 'mechanical', label: 'Mechanical', icon: 'cog', active: true },
        { id: 'safety', key: 'safety', label: 'Safety', icon: 'shield-alt', active: true },
        { id: 'equipment', key: 'equipment', label: 'Equipment', icon: 'wrench', active: true },
      ];
      for (const t of issueTypes) {
        await setDoc(doc(db, 'issueTypes', t.id), { key: t.key, label: t.label, icon: t.icon, active: !!t.active, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
  } catch (_) { /* ignore permission issues */ }
}

// Convenience: seed all lookups and options, safe to call at startup
export async function ensureSeededAll() {
  await ensureSeededOptions();
  await seedLookupCollectionsIfEmpty();
}

const OptionsAPI = {
  getOptions,
  ensureSeededOptions,
  ensureSeededAll,
  seedLookupCollectionsIfEmpty,
};

export default OptionsAPI;
