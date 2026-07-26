/**
 * Lista completa e oficial da CID-10 (Classificação Internacional de
 * Doenças, 10ª revisão), versão brasileira do DATASUS/Ministério da Saúde —
 * ~12.450 subcategorias (códigos de 4 caracteres, os efetivamente usados
 * para diagnóstico/atestado). Carregada sob demanda (chunk separado) só
 * quando o combobox de CID é aberto, pra não pesar no carregamento inicial.
 */
export type Cid10Entry = { code: string; description: string };

let cache: [string, string][] | null = null;
let loadingPromise: Promise<[string, string][]> | null = null;

export function loadCid10(): Promise<[string, string][]> {
  if (cache) return Promise.resolve(cache);
  if (!loadingPromise) {
    loadingPromise = import('@/data/cid10.json').then((mod) => {
      cache = (mod.default ?? mod) as unknown as [string, string][];
      return cache;
    });
  }
  return loadingPromise;
}

/** Busca por código (prefixo) ou por termo na descrição. Limita resultados pra manter a lista leve. */
export function searchCid10(data: [string, string][], query: string, limit = 40): Cid10Entry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: Cid10Entry[] = [];
  for (let i = 0; i < data.length && results.length < limit; i++) {
    const [code, description] = data[i];
    if (code.toLowerCase().startsWith(q) || description.toLowerCase().includes(q)) {
      results.push({ code, description });
    }
  }
  return results;
}
