import { useEffect, useState } from 'react';

/**
 * Retorna a hora atual, atualizada periodicamente (padrão: cada 30s).
 * Usado para mover a linha de "agora" na Agenda (dia/semana), como no Google Agenda.
 */
export function useCurrentTime(refreshIntervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs]);

  return now;
}
