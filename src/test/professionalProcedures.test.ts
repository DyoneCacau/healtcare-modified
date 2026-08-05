import { describe, expect, it } from 'vitest';
import {
  buildBookingCatalogProcedures,
  isProfessionalEligibleForProcedure,
} from '@/services/smartHub/professionalProcedureEligibility';
import { BOOKING_PUBLIC_ERROR_MESSAGES } from '@/services/smartHub/BookingService';

describe('professional ↔ procedure eligibility', () => {
  it('performs_all (true/default) é elegível a qualquer procedimento', () => {
    expect(
      isProfessionalEligibleForProcedure({ performs_all_procedures: true }, 'p1', [])
    ).toBe(true);
    expect(
      isProfessionalEligibleForProcedure({ performs_all_procedures: null }, 'p1', [])
    ).toBe(true);
    expect(isProfessionalEligibleForProcedure({}, 'p1', [])).toBe(true);
  });

  it('performs_all false só com vínculo', () => {
    expect(
      isProfessionalEligibleForProcedure({ performs_all_procedures: false }, 'p1', ['p1'])
    ).toBe(true);
    expect(
      isProfessionalEligibleForProcedure({ performs_all_procedures: false }, 'p1', ['p2'])
    ).toBe(false);
    expect(
      isProfessionalEligibleForProcedure({ performs_all_procedures: false }, 'p1', [])
    ).toBe(false);
  });

  it('catálogo aninha profissionais por procedimento', () => {
    const catalog = buildBookingCatalogProcedures(
      [
        { id: 'canal', name: 'Canal', duration_minutes: 60 },
        { id: 'limpeza', name: 'Limpeza', duration_minutes: 30 },
      ],
      [
        { id: 'emanuel', name: 'Emanuel Silva', performs_all_procedures: false },
        { id: 'ana', name: 'Ana Costa', performs_all_procedures: true },
      ],
      [{ professional_id: 'emanuel', procedure_id: 'limpeza' }]
    );

    const canal = catalog.find((p) => p.id === 'canal');
    const limpeza = catalog.find((p) => p.id === 'limpeza');

    expect(canal?.professionals.map((p) => p.id)).toEqual(['ana']);
    expect(limpeza?.professionals.map((p) => p.id).sort()).toEqual(['ana', 'emanuel'].sort());
    expect(canal?.professionals[0]).toEqual({ id: 'ana', name: 'Ana Costa' });
    expect(canal?.professionals[0]).not.toHaveProperty('phone');
    expect(canal?.professionals[0]).not.toHaveProperty('cro');
  });

  it('mensagem pública para professional_not_eligible', () => {
    expect(BOOKING_PUBLIC_ERROR_MESSAGES.professional_not_eligible).toMatch(/procedimento/i);
  });
});
