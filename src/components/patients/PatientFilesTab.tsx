import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Columns2,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ADULT_TEETH } from '@/types/dental';
import {
  PATIENT_FILE_CATEGORY_LABELS,
  PatientFile,
  PatientFileCategory,
} from '@/types/patientFile';
import { usePatientEvolutions } from '@/hooks/usePatientEvolutions';
import { usePatientFileMutations, usePatientFiles } from '@/hooks/usePatientFiles';
import { PatientFileViewer } from './PatientFileViewer';
import { cn } from '@/lib/utils';

interface PatientFilesTabProps {
  patientId: string;
}

const TOOTH_OPTIONS = [
  ...ADULT_TEETH.upperRight,
  ...ADULT_TEETH.upperLeft,
  ...ADULT_TEETH.lowerRight,
  ...ADULT_TEETH.lowerLeft,
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientFilesTab({ patientId }: PatientFilesTabProps) {
  const { files, isLoading } = usePatientFiles(patientId);
  const { uploadFile, updateFile, deleteFile } = usePatientFileMutations(patientId);
  const { evolutions } = usePatientEvolutions(patientId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PatientFileCategory>('radiografia');
  const [notes, setNotes] = useState('');
  const [toothNumber, setToothNumber] = useState('none');
  const [evolutionId, setEvolutionId] = useState('none');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewerFile, setViewerFile] = useState<PatientFile | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<{ left: PatientFile; right: PatientFile } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PatientFileCategory>('all');

  const filteredFiles = useMemo(() => {
    if (categoryFilter === 'all') return files;
    return files.filter((f) => f.category === categoryFilter);
  }, [files, categoryFilter]);

  const resetUpload = () => {
    setName('');
    setNotes('');
    setCategory('radiografia');
    setToothNumber('none');
    setEvolutionId('none');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadFile.mutate(
      {
        file: selectedFile,
        name: name.trim() || selectedFile.name,
        category,
        notes,
        toothNumber: toothNumber === 'none' ? null : Number(toothNumber),
        evolutionId: evolutionId === 'none' ? null : evolutionId,
      },
      { onSuccess: () => resetUpload() }
    );
  };

  const toggleCompareSelect = (file: PatientFile) => {
    if (!file.mimeType.startsWith('image/')) return;
    setCompareSelection((prev) => {
      if (prev.includes(file.id)) return prev.filter((id) => id !== file.id);
      if (prev.length >= 2) return [prev[1], file.id];
      return [...prev, file.id];
    });
  };

  const openCompare = () => {
    if (compareSelection.length !== 2) return;
    const left = files.find((f) => f.id === compareSelection[0]);
    const right = files.find((f) => f.id === compareSelection[1]);
    if (!left || !right) return;
    setComparePair({ left, right });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Anexar arquivo clínico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Radiografia panorâmica"
              />
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
              <Label>Dente (opcional)</Label>
              <Select value={toothNumber} onValueChange={setToothNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem vínculo" />
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
            <div className="space-y-2">
              <Label>Evolução (opcional)</Label>
              <Select value={evolutionId} onValueChange={setEvolutionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {evolutions.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {format(parseISO(ev.evolutionDate), 'dd/MM/yyyy', { locale: ptBR })} —{' '}
                      {ev.content.slice(0, 36)}
                      {ev.content.length > 36 ? '…' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Controle pós-endodontia"
                className="min-h-[70px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar arquivo
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground truncate max-w-[220px]" title={selectedFile.name}>
                {selectedFile.name} ({formatBytes(selectedFile.size)})
              </span>
            )}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadFile.isPending}
            >
              {uploadFile.isPending ? 'Enviando...' : 'Anexar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF ou PDF • Máx. 10 MB
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as 'all' | PatientFileCategory)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {(Object.keys(PATIENT_FILE_CATEGORY_LABELS) as PatientFileCategory[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PATIENT_FILE_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setCompareMode((v) => !v);
              setCompareSelection([]);
            }}
          >
            <Columns2 className="h-4 w-4 mr-2" />
            {compareMode ? 'Saindo da comparação' : 'Comparar antes/depois'}
          </Button>
          {compareMode && (
            <Button size="sm" disabled={compareSelection.length !== 2} onClick={openCompare}>
              Abrir comparação ({compareSelection.length}/2)
            </Button>
          )}
        </div>
      </div>

      {compareMode && (
        <p className="text-sm text-muted-foreground">
          Selecione 2 imagens para comparar lado a lado (diferencial do HealthCare).
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum arquivo clínico anexado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredFiles.map((file) => {
            const selected = compareSelection.includes(file.id);
            const isImage = file.mimeType.startsWith('image/');
            return (
              <Card
                key={file.id}
                className={cn(
                  'overflow-hidden cursor-pointer transition-shadow hover:shadow-md',
                  selected && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  if (compareMode) {
                    toggleCompareSelect(file);
                    return;
                  }
                  setViewerFile(file);
                }}
              >
                <div className="aspect-video bg-muted/40 flex items-center justify-center overflow-hidden">
                  {isImage && file.signedUrl ? (
                    <img
                      src={file.signedUrl}
                      alt={file.name}
                      className="h-full w-full object-cover"
                      style={{ transform: `rotate(${file.rotation}deg)` }}
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(file.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(file.id);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{PATIENT_FILE_CATEGORY_LABELS[file.category]}</Badge>
                    {file.toothNumber != null && (
                      <Badge variant="outline">Dente {file.toothNumber}</Badge>
                    )}
                    {file.evolutionId && <Badge variant="outline">Evolução</Badge>}
                    {isImage && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Imagem
                      </Badge>
                    )}
                  </div>
                  {file.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{file.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PatientFileViewer
        open={!!viewerFile}
        onOpenChange={(open) => !open && setViewerFile(null)}
        file={viewerFile}
        evolutions={evolutions}
        isSaving={updateFile.isPending}
        onSave={(input) => {
          updateFile.mutate(input, {
            onSuccess: () => setViewerFile(null),
          });
        }}
      />

      <PatientFileViewer
        open={!!comparePair}
        onOpenChange={(open) => {
          if (!open) setComparePair(null);
        }}
        file={comparePair?.left || null}
        compareFile={comparePair?.right || null}
        evolutions={evolutions}
        onSave={() => undefined}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo será removido do prontuário e do armazenamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteFile.mutate(deleteId, {
                    onSuccess: () => {
                      if (viewerFile?.id === deleteId) setViewerFile(null);
                      setCompareSelection((prev) => prev.filter((id) => id !== deleteId));
                      setDeleteId(null);
                    },
                  });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
