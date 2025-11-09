import { useEffect, useRef } from 'react';

// Persist and restore form drafts in localStorage
// use with react-hook-form: pass watch + reset
export function useFormDraft(key, watch, reset, { exclude = [] } = {}) {
  const restoredRef = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (restoredRef.current) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        reset(data);
      }
    } catch (_) { /* ignore */ }
    restoredRef.current = true;
  }, [key, reset]);

  // Persist on change (debounced via microtask)
  useEffect(() => {
    const sub = watch((values) => {
      try {
        const payload = { ...values };
        exclude.forEach((f) => delete payload[f]);
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (_) { /* ignore */ }
    });
    return () => sub.unsubscribe();
  }, [key, watch, exclude]);

  const clearDraft = () => {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
  };

  return { clearDraft };
}
