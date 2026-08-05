import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|error loading dynamically imported module|ChunkLoadError/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') return CHUNK_ERROR_RE.test(error);
  if (error instanceof Error) {
    return CHUNK_ERROR_RE.test(error.message) || CHUNK_ERROR_RE.test(error.name);
  }
  return CHUNK_ERROR_RE.test(String(error));
}

/**
 * Recarrega a página uma vez após falha de chunk (deploy novo / hash antigo).
 * Evita loop com guard de 10s em sessionStorage.
 */
export function reloadOnceOnChunkError(storageKey = 'vite-chunk-reload-at'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lastReload = Number(sessionStorage.getItem(storageKey) || 0);
    const now = Date.now();
    if (now - lastReload > 10_000) {
      sessionStorage.setItem(storageKey, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    window.location.reload();
    return true;
  }
  return false;
}

type DefaultExportModule<T extends ComponentType<unknown>> = { default: T };

/**
 * React.lazy com 1 retry e reload em falha de chunk.
 * Evita rota “travada” após deploy (promise rejeitada cacheada pelo lazy).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<DefaultExportModule<T>>,
  retries = 1
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (isChunkLoadError(error) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        if (isChunkLoadError(error)) {
          reloadOnceOnChunkError();
        }
        throw error;
      }
    }
    throw lastError;
  }) as LazyExoticComponent<T>;
}
