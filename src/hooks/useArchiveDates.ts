import { useEffect, useState } from 'react';

async function fetchDatesFromApi(): Promise<string[] | null> {
  try {
    const r = await fetch('/api/news-dates');
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.dates) ? (j.dates as string[]) : null;
  } catch {
    return null;
  }
}

async function fetchDatesFromStatic(): Promise<string[] | null> {
  try {
    const r = await fetch('/news-dates.json');
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.dates) ? (j.dates as string[]) : null;
  } catch {
    return null;
  }
}

// Shared loader: API first (local serve.cjs), static fallback (Vercel deploy).
export async function loadArchiveDates(): Promise<string[]> {
  return (await fetchDatesFromApi()) ?? (await fetchDatesFromStatic()) ?? [];
}

export function useArchiveDates() {
  const [dates, setDates] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadArchiveDates().then((d) => {
      if (cancelled) return;
      setDates(d);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { dates, loaded };
}
