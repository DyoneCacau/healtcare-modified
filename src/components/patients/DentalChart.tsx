import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, Clock, Pencil, Trash2, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DentalChart as DentalChartType,
  ToothRecord,
  ToothStatus,
  ToothProcedure,
  ADULT_TEETH,
  TOOTH_STATUS_CONFIG,
  TOOTH_PROCEDURE_STATUS_LABELS,
} from '@/types/dental';
import { PatientFile, PATIENT_FILE_CATEGORY_LABELS } from '@/types/patientFile';
import { toast } from 'sonner';

type ChartFilter = 'all' | 'a_realizar' | 'realizado' | 'preexistente';

const CHART_FILTERS: { key: ChartFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'a_realizar', label: 'A realizar' },
  { key: 'realizado', label: 'Realizado' },
  { key: 'preexistente', label: 'Pré-existente' },
];

function procedureMatchesFilter(
  status: ToothProcedure['status'],
  filter: ChartFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'a_realizar') return status === 'pending' || status === 'scheduled';
  if (filter === 'realizado') return status === 'completed';
  if (filter === 'preexistente') return status === 'preexisting';
  return true;
}

function toothMatchesFilter(tooth: ToothRecord, filter: ChartFilter): boolean {
  if (filter === 'all') return true;
  if (tooth.procedures.some((p) => procedureMatchesFilter(p.status, filter))) return true;
  if (filter === 'a_realizar') {
    return tooth.status === 'pending' || tooth.status === 'cavity';
  }
  if (filter === 'realizado') {
    return tooth.status === 'treated' || tooth.status === 'implant' || tooth.status === 'prosthesis';
  }
  if (filter === 'preexistente') {
    return tooth.status === 'extracted' || tooth.status === 'root_canal' || tooth.status === 'cavity';
  }
  return false;
}

interface DentalChartProps {
  chart: DentalChartType;
  onUpdateChart: (chart: DentalChartType) => void;
  readOnly?: boolean;
  /** Arquivos clínicos vinculados a dentes (ex.: raio-X do dente 12). */
  linkedFiles?: PatientFile[];
  onOpenLinkedFile?: (file: PatientFile) => void;
}

interface ToothProps {
  tooth: ToothRecord;
  onClick: () => void;
  position: 'upper' | 'lower';
  linkedFileCount?: number;
}

function Tooth({ tooth, onClick, position, linkedFileCount = 0, dimmed = false }: ToothProps & { dimmed?: boolean }) {
  const config = TOOTH_STATUS_CONFIG[tooth.status];
  const hasPendingProcedures = tooth.procedures.some(
    (p) => p.status === 'pending' || p.status === 'scheduled',
  );
  const hasLinkedFiles = linkedFileCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center w-10 h-14 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-lg',
        config.bgColor,
        tooth.status === 'extracted' ? 'opacity-50' : '',
        dimmed && 'opacity-25 hover:opacity-60',
        hasPendingProcedures && 'ring-2 ring-amber-400 ring-offset-1',
        hasLinkedFiles && !hasPendingProcedures && 'ring-2 ring-sky-400 ring-offset-1'
      )}
      title={
        hasLinkedFiles
          ? `Dente ${tooth.number} - ${config.label} • ${linkedFileCount} arquivo(s)`
          : `Dente ${tooth.number} - ${config.label}`
      }
    >
      <div
        className={cn(
          'w-6 h-8 rounded-t-full border-2 border-current',
          position === 'lower' && 'rounded-t-none rounded-b-full',
          config.color
        )}
      >
        <div className="w-full h-full flex items-center justify-center text-[9px] font-semibold">
          {tooth.status === 'extracted' && <span>X</span>}
          {tooth.status === 'implant' && <span>IMP</span>}
          {tooth.status === 'prosthesis' && <span>PRO</span>}
        </div>
      </div>
      <span className="text-xs font-bold mt-0.5">{tooth.number}</span>
      {hasPendingProcedures && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
      )}
      {hasLinkedFiles && (
        <span
          className={cn(
            'absolute -bottom-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center',
            hasPendingProcedures && '-left-1 right-auto'
          )}
          aria-label={`${linkedFileCount} arquivo(s) vinculado(s)`}
        >
          {linkedFileCount > 1 ? linkedFileCount : <Paperclip className="h-2.5 w-2.5" />}
        </span>
      )}
    </button>
  );
}

export function DentalChart({
  chart,
  onUpdateChart,
  readOnly = false,
  linkedFiles = [],
  onOpenLinkedFile,
}: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [procedureMode, setProcedureMode] = useState<'add' | 'edit'>('add');
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [newProcedure, setNewProcedure] = useState({
    procedure: '',
    professional: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'pending' as ToothProcedure['status'],
  });
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');

  const handleToothClick = (toothNumber: number) => {
    const tooth = chart.teeth[toothNumber];
    if (tooth) {
      setSelectedTooth(tooth);
      setDialogOpen(true);
    }
  };

  const handleStatusChange = (status: ToothStatus) => {
    if (!selectedTooth || readOnly) return;

    const updatedChart = {
      ...chart,
      teeth: {
        ...chart.teeth,
        [selectedTooth.number]: {
          ...selectedTooth,
          status,
        },
      },
      lastUpdate: new Date().toISOString().split('T')[0],
    };

    onUpdateChart(updatedChart);
    setSelectedTooth({ ...selectedTooth, status });
    toast.success(
      `Dente ${selectedTooth.number} atualizado para ${TOOTH_STATUS_CONFIG[status].label}`
    );
  };

  const resetProcedureForm = () => {
    setNewProcedure({
      procedure: '',
      professional: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'pending',
    });
  };

  const handleOpenAddProcedure = () => {
    setProcedureMode('add');
    setEditingProcedureId(null);
    resetProcedureForm();
    setProcedureDialogOpen(true);
  };

  const handleAddProcedure = () => {
    if (!selectedTooth || !newProcedure.procedure || !newProcedure.professional) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const procedure = {
      id:
        procedureMode === 'edit' && editingProcedureId
          ? editingProcedureId
          : `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      procedure: newProcedure.procedure,
      professional: newProcedure.professional,
      date: newProcedure.date,
      notes: newProcedure.notes,
      status: newProcedure.status,
    };

    const updatedTooth = {
      ...selectedTooth,
      procedures:
        procedureMode === 'edit' && editingProcedureId
          ? selectedTooth.procedures.map((p) => (p.id === editingProcedureId ? procedure : p))
          : [...selectedTooth.procedures, procedure],
    };

    const updatedChart = {
      ...chart,
      teeth: {
        ...chart.teeth,
        [selectedTooth.number]: updatedTooth,
      },
      lastUpdate: new Date().toISOString().split('T')[0],
    };

    onUpdateChart(updatedChart);
    setSelectedTooth(updatedTooth);
    setProcedureDialogOpen(false);
    resetProcedureForm();
    setProcedureMode('add');
    setEditingProcedureId(null);
    toast.success(procedureMode === 'edit' ? 'Procedimento atualizado!' : 'Procedimento adicionado!');
  };

  const handleEditProcedure = (procedureId: string) => {
    if (!selectedTooth) return;
    const proc = selectedTooth.procedures.find((p) => p.id === procedureId);
    if (!proc) return;
    setProcedureMode('edit');
    setEditingProcedureId(proc.id);
    setNewProcedure({
      procedure: proc.procedure,
      professional: proc.professional,
      date: proc.date,
      notes: proc.notes || '',
      status: proc.status || 'completed',
    });
    setProcedureDialogOpen(true);
  };

  const handleDeleteProcedure = (procedureId: string) => {
    if (!selectedTooth) return;
    const updatedTooth = {
      ...selectedTooth,
      procedures: selectedTooth.procedures.filter((p) => p.id !== procedureId),
    };
    const updatedChart = {
      ...chart,
      teeth: {
        ...chart.teeth,
        [selectedTooth.number]: updatedTooth,
      },
      lastUpdate: new Date().toISOString().split('T')[0],
    };
    onUpdateChart(updatedChart);
    setSelectedTooth(updatedTooth);
    toast.success('Procedimento removido');
  };

  const filesByTooth = useMemo(() => {
    const map = new Map<number, PatientFile[]>();
    for (const file of linkedFiles) {
      if (file.toothNumber == null) continue;
      const list = map.get(file.toothNumber) || [];
      list.push(file);
      map.set(file.toothNumber, list);
    }
    return map;
  }, [linkedFiles]);

  const selectedToothFiles =
    selectedTooth != null ? filesByTooth.get(selectedTooth.number) || [] : [];

  const pendingProcedures = useMemo(() => {
    const items: { toothNumber: number; procedure: ToothProcedure }[] = [];
    Object.values(chart.teeth).forEach((tooth) => {
      tooth.procedures
        .filter((p) => p.status === 'pending' || p.status === 'scheduled')
        .forEach((procedure) => items.push({ toothNumber: tooth.number, procedure }));
    });
    return items;
  }, [chart.teeth]);

  const completedProcedures = useMemo(() => {
    const items: { toothNumber: number; procedure: ToothProcedure }[] = [];
    Object.values(chart.teeth).forEach((tooth) => {
      tooth.procedures
        .filter((p) => p.status === 'completed')
        .forEach((procedure) => items.push({ toothNumber: tooth.number, procedure }));
    });
    return items;
  }, [chart.teeth]);

  const preexistingProcedures = useMemo(() => {
    const items: { toothNumber: number; procedure: ToothProcedure }[] = [];
    Object.values(chart.teeth).forEach((tooth) => {
      tooth.procedures
        .filter((p) => p.status === 'preexisting')
        .forEach((procedure) => items.push({ toothNumber: tooth.number, procedure }));
    });
    return items;
  }, [chart.teeth]);

  const teethWithFiles = Array.from(filesByTooth.entries())
    .map(([toothNumber, files]) => ({ toothNumber, files }))
    .sort((a, b) => a.toothNumber - b.toothNumber);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <p className="text-center text-xs font-medium text-muted-foreground">Legenda de status</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(TOOTH_STATUS_CONFIG).map(([status, config]) => (
            <Badge key={status} variant="outline" className={cn(config.bgColor, config.color, 'text-xs')}>
              {config.label}
            </Badge>
          ))}
          <Badge variant="outline" className="bg-sky-100 text-sky-700 text-xs gap-1">
            <Paperclip className="h-3 w-3" />
            Com arquivo
          </Badge>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-border/60">
          {CHART_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={chartFilter === f.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setChartFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-sm leading-normal text-muted-foreground">Arcada Superior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max justify-center gap-1">
              {ADULT_TEETH.upperRight.map((num) => (
                <Tooth
                  key={num}
                  tooth={chart.teeth[num]}
                  onClick={() => handleToothClick(num)}
                  position="upper"
                  linkedFileCount={filesByTooth.get(num)?.length || 0}
                  dimmed={chartFilter !== 'all' && !toothMatchesFilter(chart.teeth[num], chartFilter)}
                />
              ))}
              <div className="w-4" />
              {ADULT_TEETH.upperLeft.map((num) => (
                <Tooth
                  key={num}
                  tooth={chart.teeth[num]}
                  onClick={() => handleToothClick(num)}
                  position="upper"
                  linkedFileCount={filesByTooth.get(num)?.length || 0}
                  dimmed={chartFilter !== 'all' && !toothMatchesFilter(chart.teeth[num], chartFilter)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-border my-4" />

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max justify-center gap-1">
              {ADULT_TEETH.lowerRight.map((num) => (
                <Tooth
                  key={num}
                  tooth={chart.teeth[num]}
                  onClick={() => handleToothClick(num)}
                  position="lower"
                  linkedFileCount={filesByTooth.get(num)?.length || 0}
                  dimmed={chartFilter !== 'all' && !toothMatchesFilter(chart.teeth[num], chartFilter)}
                />
              ))}
              <div className="w-4" />
              {ADULT_TEETH.lowerLeft.map((num) => (
                <Tooth
                  key={num}
                  tooth={chart.teeth[num]}
                  onClick={() => handleToothClick(num)}
                  position="lower"
                  linkedFileCount={filesByTooth.get(num)?.length || 0}
                  dimmed={chartFilter !== 'all' && !toothMatchesFilter(chart.teeth[num], chartFilter)}
                />
              ))}
            </div>
          </div>
        </CardContent>
        <CardHeader className="pt-0 pb-4">
          <CardTitle className="text-center text-sm leading-normal text-muted-foreground">Arcada Inferior</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <Clock className="h-4 w-4" />
              A realizar ({pendingProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProcedures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum procedimento a realizar</p>
            ) : (
              <div className="space-y-2">
                {pendingProcedures.slice(0, 6).map(({ toothNumber, procedure }) => (
                  <div key={procedure.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">
                      Dente {toothNumber} — {procedure.procedure}
                    </span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 shrink-0">
                      {TOOTH_PROCEDURE_STATUS_LABELS[procedure.status]}
                    </Badge>
                  </div>
                ))}
                {pendingProcedures.length > 6 && (
                  <p className="text-xs text-muted-foreground">+{pendingProcedures.length - 6} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Check className="h-4 w-4" />
              Realizados ({completedProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedProcedures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum procedimento realizado</p>
            ) : (
              <div className="space-y-2">
                {completedProcedures.slice(0, 6).map(({ toothNumber, procedure }) => (
                  <div key={procedure.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">
                      Dente {toothNumber} — {procedure.procedure}
                    </span>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 shrink-0">
                      Realizado
                    </Badge>
                  </div>
                ))}
                {completedProcedures.length > 6 && (
                  <p className="text-xs text-muted-foreground">+{completedProcedures.length - 6} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              Pré-existentes ({preexistingProcedures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preexistingProcedures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma condição pré-existente</p>
            ) : (
              <div className="space-y-2">
                {preexistingProcedures.slice(0, 6).map(({ toothNumber, procedure }) => (
                  <div key={procedure.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">
                      Dente {toothNumber} — {procedure.procedure}
                    </span>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 shrink-0">
                      Pré-existente
                    </Badge>
                  </div>
                ))}
                {preexistingProcedures.length > 6 && (
                  <p className="text-xs text-muted-foreground">+{preexistingProcedures.length - 6} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-sky-700">
            <ImageIcon className="h-4 w-4" />
            Dentes com arquivo ({teethWithFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teethWithFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum arquivo vinculado a dente. Em Arquivos, escolha o dente ao anexar a radiografia.
            </p>
          ) : (
            <div className="space-y-2">
              {teethWithFiles.map(({ toothNumber, files }) => (
                <div key={toothNumber} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">Dente {toothNumber}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-sky-100 text-sky-700">
                      {files.length} arquivo{files.length > 1 ? 's' : ''}
                    </Badge>
                    {onOpenLinkedFile && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenLinkedFile(files[0])}
                      >
                        Ver
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Dente {selectedTooth?.number}
              {selectedTooth && (
                <Badge
                  className={cn(
                    TOOTH_STATUS_CONFIG[selectedTooth.status].bgColor,
                    TOOTH_STATUS_CONFIG[selectedTooth.status].color
                  )}
                >
                  {TOOTH_STATUS_CONFIG[selectedTooth.status].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTooth && (
            <div className="space-y-4">
              {!readOnly && (
                <div className="space-y-2">
                  <Label>Alterar Status</Label>
                  <Select value={selectedTooth.status} onValueChange={(v) => handleStatusChange(v as ToothStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOOTH_STATUS_CONFIG).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Arquivos clínicos</Label>
                  <Badge variant="outline" className="bg-sky-100 text-sky-700">
                    {selectedToothFiles.length}
                  </Badge>
                </div>
                {selectedToothFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhum arquivo vinculado a este dente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedToothFiles.map((file) => (
                      <Card key={file.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {PATIENT_FILE_CATEGORY_LABELS[file.category]}
                            </p>
                          </div>
                          {onOpenLinkedFile && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenLinkedFile(file)}
                            >
                              Abrir
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Histórico de Procedimentos</Label>
                  {!readOnly && (
                    <Button size="sm" variant="outline" onClick={handleOpenAddProcedure}>
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-[200px]">
                  {selectedTooth.procedures.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum procedimento registrado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTooth.procedures.map((proc) => (
                        <Card key={proc.id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">{proc.procedure}</p>
                              <p className="text-xs text-muted-foreground">{proc.professional}</p>
                              {proc.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{proc.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(proc.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs mt-1',
                                  proc.status === 'completed' && 'bg-emerald-100 text-emerald-700',
                                  (proc.status === 'pending' || proc.status === 'scheduled') &&
                                    'bg-amber-100 text-amber-700',
                                  proc.status === 'preexisting' && 'bg-slate-100 text-slate-700',
                                )}
                              >
                                {TOOTH_PROCEDURE_STATUS_LABELS[proc.status] || 'Realizado'}
                              </Badge>
                              {!readOnly && (
                                <div className="mt-2 flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => handleEditProcedure(proc.id)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteProcedure(proc.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {procedureMode === 'edit' ? 'Editar Procedimento' : 'Adicionar Procedimento'} - Dente{' '}
              {selectedTooth?.number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Procedimento *</Label>
              <Input
                value={newProcedure.procedure}
                onChange={(e) => setNewProcedure({ ...newProcedure, procedure: e.target.value })}
                placeholder="Ex: Restauração, Canal, Limpeza..."
              />
            </div>

            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Input
                value={newProcedure.professional}
                onChange={(e) => setNewProcedure({ ...newProcedure, professional: e.target.value })}
                placeholder="Nome do profissional"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <DateInput
                value={newProcedure.date}
                onChange={(v) => setNewProcedure({ ...newProcedure, date: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={newProcedure.status}
                onValueChange={(v) =>
                  setNewProcedure({ ...newProcedure, status: v as ToothProcedure['status'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">A realizar</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Realizado</SelectItem>
                  <SelectItem value="preexisting">Pré-existente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={newProcedure.notes}
                onChange={(e) => setNewProcedure({ ...newProcedure, notes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcedureDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddProcedure}>
              {procedureMode === 'edit' ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
