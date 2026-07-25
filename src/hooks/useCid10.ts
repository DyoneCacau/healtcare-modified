import { useEffect, useMemo, useState } from 'react';
import { loadCid10, searchCid10, type Cid10Entry } from '@/lib/cid10';

/** Carrega a base da CID-10 sob demanda e devolve os resultados da busca atual. */
export function useCid10Search(query: string) {
  const [data, setData] = useState<[string, string][] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCid10().then((rows) => {
      if (active) {
        setData(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo<Cid10Entry[]>(() => (data ? searchCid10(data, query) : []), [data, query]);

  return { results, loading };
}
