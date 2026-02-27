import { cn } from "@/lib/utils";

interface ClinicDisplayNameProps {
  clinic: { name?: string | null; unit_name?: string | null; neighborhood?: string | null };
  /** Se true, usa span com unidade em estilo discreto (opacity). Se false, retorna texto simples. */
  withUnitMuted?: boolean;
  className?: string;
}

/** Obtém o identificador da unidade: unit_name ou neighborhood (bairro) como fallback */
function getUnitLabel(clinic: { unit_name?: string | null; neighborhood?: string | null } | null): string | null {
  if (!clinic) return null;
  const c = clinic as { unit_name?: string | null; neighborhood?: string | null };
  return c.unit_name?.trim() || c.neighborhood?.trim() || null;
}

/**
 * Exibe o nome da clínica. Quando há unit_name ou neighborhood (bairro),
 * mostra em estilo discreto: Nome (Unidade) - a unidade fica mais transparente.
 */
export function ClinicDisplayName({ clinic, withUnitMuted = true, className }: ClinicDisplayNameProps) {
  const name = clinic?.name || "";
  const unit = getUnitLabel(clinic);

  if (!unit || !withUnitMuted) {
    return <span className={className}>{unit ? `${name} (${unit})` : name}</span>;
  }

  return (
    <span className={cn("inline", className)}>
      {name}
      <span className="opacity-60 text-[0.9em]"> ({unit})</span>
    </span>
  );
}
