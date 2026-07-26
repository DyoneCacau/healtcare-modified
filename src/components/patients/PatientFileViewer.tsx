import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Minus,
  Plus,
  Printer,
  RotateCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADULT_TEETH } from '@/types/dental';
import { PatientFile, PATIENT_FILE_CATEGORY_LABELS, PatientFileCategory } from '@/types/patientFile';
import { PatientEvolution } from '@/hooks/usePatientEvolutions';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientFileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PatientFile | null;
  compareFile?: PatientFile | null;
  evolutions: PatientEvolution[];
  onSave: (input: {
    id: string;
    name: string;
    notes: string;
    category: PatientFileCategory;
    toothNumber: number | null;
    evolutionId: string | null;
    rotation: 0 | 90 | 180 | 270;
  }) => void;
  isSaving?: boolean;
}

const TOOTH_OPTIONS = [
  ...ADULT_TEETH.upperRight,
  ...ADULT_TEETH.upperLeft,
  ...ADULT_TEETH.lowerRight,
  ...ADULT_TEETH.lowerLeft,
];

function nextRotation(current: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  const map: Record<0 | 90 | 180 | 270, 0 | 90 | 180 | 270> = {
    0: 90,
    90: 180,
    180: 270,
    270: 0,
  };
  return map[current];
}

export function PatientFileViewer({
  open,
  onOpenChange,
  file,
  compareFile = null,
  evolutions,
  onSave,
  isSaving = false,
}: PatientFileViewerProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<PatientFileCategory>('radiografia');
  const [toothNumber, setToothNumber] = useState<string>('none');
  const [evolutionId, setEvolutionId] = useState<string>('none');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!file || !open) return;
    setName(file.name);
    setNotes(file.notes || '');
    setCategory(file.category);
    setToothNumber(file.toothNumber != null ? String(file.toothNumber) : 'none');
    setEvolutionId(file.evolutionId || 'none');
    setRotation(file.rotation || 0);
    setZoom(1);
  }, [file, open]);

  const isImage = !!file?.mimeType?.startsWith('image/');
  const isPdf = file?.mimeType === 'application/pdf';
  const compareIsImage = !!compareFile?.mimeType?.startsWith('image/');

  const evolutionLabel = useMemo(() => {
    return (ev: PatientEvolution) => {
      const date = format(parseISO(ev.evolutionDate), 'dd/MM/yyyy', { locale: ptBR });
      const preview = ev.content.slice(0, 40).replace(/\s+/g, ' ');
      return `${date} — ${preview}${ev.content.length > 40 ? '…' : ''}`;
    };
  }, []);

  if (!file) return null;

  const handleDownload = () => {
    if (!file.signedUrl) return;
    const a = document.createElement('a');
    a.href = file.signedUrl;
    a.download = file.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handlePrint = () => {
    if (!file.signedUrl) return;
    const win = window.open(file.signedUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch {
          /* ignore */
        }
      }, 500);
    }
  };

  const handleSave = () => {
    onSave({
      id: file.id,
      name: name.trim() || file.name,
      notes,
      category,
      toothNumber: toothNumber === 'none' ? null : Number(toothNumber),
      evolutionId: evolutionId === 'none' ? null : evolutionId,
      rotation,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{file.name}</DialogTitle>
          <DialogDescription>
            Visualize, anote e vincule ao dente ou à evolução do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isImage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-14 text-center">{Math.round(zoom * 100)}%</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                <Plus className="h-4 w-4" />
              </Button>
              {!compareFile && (
                <Button type="button" variant="outline" size="sm" onClick={() => setRotation(nextRotation(rotation))}>
                  <RotateCw className="h-4 w-4 mr-1" />
                  Girar
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
            </div>
          )}

          <div className={compareFile ? 'grid gap-3 md:grid-cols-2' : ''}>
            <div className="rounded-lg border bg-muted/30 overflow-auto max-h-[50vh] flex items-center justify-center p-2">
              {isImage && file.signedUrl ? (
                <img
                  src={file.signedUrl}
                  alt={file.name}
                  className="max-w-full object-contain transition-transform origin-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    maxHeight: compareFile ? '40vh' : '48vh',
                  }}
                />
              ) : isPdf && file.signedUrl ? (
                <iframe title={file.name} src={file.signedUrl} className="w-full h-[48vh] rounded" />
              ) : (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  Pré-visualização indisponível. Use Baixar para abrir o arquivo.
                </p>
              )}
            </div>

            {compareFile && (
              <div className="rounded-lg border bg-muted/30 overflow-auto max-h-[50vh] flex flex-col items-center justify-center p-2 gap-2">
                <p className="text-xs text-muted-foreground self-start px-1 truncate w-full">{compareFile.name}</p>
                {compareIsImage && compareFile.signedUrl ? (
                  <img
                    src={compareFile.signedUrl}
                    alt={compareFile.name}
                    className="max-w-full object-contain"
                    style={{
                      transform: `scale(${zoom}) rotate(${compareFile.rotation || 0}deg)`,
                      maxHeight: '40vh',
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Arquivo de comparação sem pré-visualização de imagem.
                  </p>
                )}
              </div>
            )}
          </div>

          {!compareFile && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as PatientFileCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PATIENT_FILE_CATEGORY_LABELS) as PatientFileCategory[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {PATIENT_FILE_CATEGORY_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dente (odontograma)</Label>
                <Select value={toothNumber} onValueChange={setToothNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {TOOTH_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Dente {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Evolução vinculada</Label>
                <Select value={evolutionId} onValueChange={setEvolutionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {evolutions.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {evolutionLabel(ev)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observação</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicionar observação"
                  className="min-h-[90px]"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          {!compareFile && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
