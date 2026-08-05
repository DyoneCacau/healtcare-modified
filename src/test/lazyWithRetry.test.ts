import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isChunkLoadError, reloadOnceOnChunkError } from '@/lib/lazyWithRetry';

describe('lazyWithRetry helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta erros típicos de chunk pós-deploy', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/X.js'))
    ).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 5 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Network offline'))).toBe(false);
  });

  it('recarrega uma vez e respeita o guard de 10s', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    expect(reloadOnceOnChunkError('test-chunk-reload')).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    expect(reloadOnceOnChunkError('test-chunk-reload')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
