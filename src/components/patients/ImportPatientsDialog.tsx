import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useQueryClient } from "@tanstack/react-query";
import {
  PATIENT_CSV_TEMPLATE,
  parsePatientCsv,
  type PatientImportError,
} from "@/lib/patientImport";

const MAX_ROWS = 500;
const CHUNK = 50;

export function ImportPatientsDialog() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [errors, setErrors] = useState<PatientImportError[]>([]);
  const [fileName, setFileName] = useState("");

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + PATIENT_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_pacientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setPreviewCount(0);
    const text = await file.text();
    const parsed = parsePatientCsv(text);
    setErrors(parsed.errors.slice(0, 20));
    setPreviewCount(parsed.rows.length);
    if (parsed.rows.length === 0 && parsed.errors.length > 0) {
      toast.error("Nenhuma linha válida encontrada. Confira o modelo.");
    }
  }

  async function handleImport(fileInput: HTMLInputElement | null) {
    if (!clinicId) {
      toast.error("Selecione uma clínica");
      return;
    }
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parsePatientCsv(text);
      if (parsed.rows.length === 0) {
        setErrors(parsed.errors.slice(0, 20));
        toast.error("Nenhum paciente válido para importar");
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        toast.error(`Limite de ${MAX_ROWS} pacientes por importação`);
        return;
      }

      const existingCpfs = new Set<string>();
      const { data: existing } = await supabase
        .from("patients")
        .select("cpf")
        .eq("clinic_id", clinicId)
        .not("cpf", "is", null);
      for (const row of existing ?? []) {
        if (row.cpf) existingCpfs.add(row.cpf.replace(/\D/g, ""));
      }

      const toInsert = [];
      const skipped: PatientImportError[] = [...parsed.errors];
      for (const row of parsed.rows) {
        if (row.cpf && existingCpfs.has(row.cpf)) {
          skipped.push({ line: row.line, message: `CPF ${row.cpf} já cadastrado — ignorado` });
          continue;
        }
        if (row.cpf) existingCpfs.add(row.cpf);
        toInsert.push({
          id: crypto.randomUUID(),
          clinic_id: clinicId,
          name: row.name,
          phone: row.phone,
          email: row.email,
          cpf: row.cpf,
          birth_date: row.birth_date,
          address: row.address,
          clinical_notes: row.clinical_notes,
          allergies: row.allergies,
          status: "active" as const,
        });
      }

      if (toInsert.length === 0) {
        setErrors(skipped.slice(0, 30));
        toast.error("Nenhum paciente novo para inserir (todos inválidos ou duplicados)");
        return;
      }

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { error } = await supabase.from("patients").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      setErrors(skipped.slice(0, 30));
      toast.success(
        `${inserted} paciente(s) importado(s)`
        + (skipped.length ? `; ${skipped.length} linha(s) com aviso/erro` : ""),
      );
      setOpen(false);
      setPreviewCount(0);
      setFileName("");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao importar pacientes");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar pacientes por planilha</DialogTitle>
          <DialogDescription>
            Use o modelo CSV (abre no Excel). Coluna obrigatória: <strong>nome</strong>.
            Máximo {MAX_ROWS} linhas por vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="secondary" className="w-full gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Baixar planilha modelo
          </Button>

          <div className="space-y-2">
            <Label htmlFor="patients-csv">Arquivo CSV</Label>
            <input
              id="patients-csv"
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                {fileName}
                {previewCount > 0 ? ` · ${previewCount} linha(s) válida(s)` : ""}
              </p>
            )}
          </div>

          {errors.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              {errors.map((err, idx) => (
                <p key={`${err.line}-${idx}`}>
                  Linha {err.line}: {err.message}
                </p>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Colunas (separadas por ponto e vírgula): nome; telefone; email; cpf;
            data_nascimento (DD/MM/AAAA); endereco; observacoes; alergias.
            Baixe o modelo — abre corretamente no Excel com uma coluna por campo.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            className="gap-2"
            disabled={importing || previewCount === 0}
            onClick={() => {
              const input = document.getElementById("patients-csv") as HTMLInputElement | null;
              void handleImport(input);
            }}
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
