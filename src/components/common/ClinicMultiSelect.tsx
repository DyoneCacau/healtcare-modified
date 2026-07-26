import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { getClinicDisplayName } from "@/lib/utils";

interface ClinicOption {
  id: string;
  name?: string | null;
  unit_name?: string | null;
}

interface ClinicMultiSelectProps {
  label?: string;
  clinics: ClinicOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** IDs que não podem ser desmarcados (ex.: a clínica atual) */
  lockedIds?: string[];
  placeholder?: string;
  helperText?: string;
}

/**
 * Lista suspensa (Popover + checkboxes) para selecionar uma ou mais clínicas.
 * A lista vem sempre de `clinics` (ex.: useClinics()), então unidades criadas
 * no futuro aparecem automaticamente aqui sem precisar de nenhuma mudança de código.
 */
export function ClinicMultiSelect({
  label = "Unidades de atuação",
  clinics,
  selectedIds,
  onChange,
  lockedIds = [],
  placeholder = "Selecione as unidades",
  helperText,
}: ClinicMultiSelectProps) {
  const summary = useMemo(() => {
    if (selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const clinic = clinics.find((c) => c.id === selectedIds[0]);
      return clinic ? getClinicDisplayName(clinic) : "1 unidade selecionada";
    }
    return `${selectedIds.length} unidades selecionadas`;
  }, [selectedIds, clinics, placeholder]);

  const toggle = (id: string) => {
    if (lockedIds.includes(id)) return;
    onChange(selectedIds.includes(id) ? selectedIds.filter((c) => c !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" type="button" className="w-full justify-between font-normal">
            <span className="truncate">{summary}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {clinics.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma unidade encontrada</p>
          ) : (
            <div className="max-h-60 space-y-0.5 overflow-y-auto">
              {clinics.map((clinic) => (
                <label
                  key={clinic.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedIds.includes(clinic.id)}
                    onCheckedChange={() => toggle(clinic.id)}
                    disabled={lockedIds.includes(clinic.id)}
                  />
                  <span>
                    {getClinicDisplayName(clinic)}
                    {lockedIds.includes(clinic.id) && <span className="text-muted-foreground"> (atual)</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
