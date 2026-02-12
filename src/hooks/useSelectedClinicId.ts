import { useEffect, useState } from 'react';

const STORAGE_KEY = 'superadmin_clinic_id';
const CHANGE_EVENT = 'superadmin_clinic_change';

export function useSelectedClinicId() {
  const [selectedClinicId, setSelectedClinicIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSelectedClinicIdState(event.newValue);
      }
    };

    const handleCustomChange = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail;
      setSelectedClinicIdState(detail ?? null);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHANGE_EVENT, handleCustomChange);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setSelectedClinicId = (id: string | null) => {
    if (typeof window === 'undefined') return;
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSelectedClinicIdState(id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
  };

  return { selectedClinicId, setSelectedClinicId };
}
