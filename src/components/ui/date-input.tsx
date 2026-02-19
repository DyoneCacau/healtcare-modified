import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  /** Valor ISO: yyyy-MM-dd (igual Supabase / inputs type=date). */
  value: string;
  /** Recebe valor ISO: yyyy-MM-dd. */
  onChange: (value: string) => void;
};

function isoToBr(iso: string): string {
  // Esperado: yyyy-MM-dd
  if (!iso || iso.length < 10) return "";
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  const d = iso.slice(8, 10);
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function brToIso(br: string): string | null {
  // Esperado: dd/MM/yyyy
  const cleaned = br.trim();
  const m = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(yyyy);
  if (y < 1900 || y > 2100) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  // Valida data real (ex.: 31/02)
  const date = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Input de data que SEMPRE mostra `dd/MM/aaaa`, sem depender do locale do navegador.
 * Internamente continua usando ISO `yyyy-MM-dd` (compatível com Supabase).
 */
export const DateInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [text, setText] = React.useState<string>(() => isoToBr(value));

    React.useEffect(() => {
      // Sincroniza quando o value externo muda.
      setText(isoToBr(value));
    }, [value]);

    return (
      <Input
        ref={ref}
        {...props}
        type="text"
        inputMode="numeric"
        placeholder={props.placeholder || "dd/MM/aaaa"}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);

          const iso = brToIso(next);
          if (iso) onChange(iso);
        }}
        onBlur={(e) => {
          // Se o usuário saiu com valor inválido, volta pro último value válido.
          const iso = brToIso(text);
          if (!iso) setText(isoToBr(value));
          onBlur?.(e);
        }}
      />
    );
  }
);
DateInput.displayName = "DateInput";

