import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, Clock, Pencil, Trash2 } from 'lucide-react';
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
  ADULT_TEETH,
  TOOTH_STATUS_CONFIG,
} from '@/types/dental';
import { toast } from 'sonner';

interface DentalChartProps {
  chart: DentalChartType;
  onUpdateChart: (chart: DentalChartType) => void;
  readOnly?: boolean;
}

interface ToothProps {
  tooth: ToothRecord;
  onClick: () => void;
  position: 'upper' | 'lower';
}

function Tooth({ tooth, onClick, position }: ToothProps) {
  const config = TOOTH_STATUS_CONFIG[tooth.status];
  const hasPendingProcedures = tooth.procedures.some((p) => p.status !== 'completed');

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center w-10 h-14 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-lg',
        config.bgColor,
        tooth.status === 'extracted' ? 'opacity-50' : '',
        hasPendingProcedures && 'ring-2 ring-amber-400 ring-offset-1'
      )}
      title={`Dente ${tooth.number} - ${config.label}`}
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
    </button>
  );
}

export function DentalChart({ chart, onUpdateChart, readOnly = false }: DentalChartProps) {
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
  });

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
      ...newProcedure,
      status: 'completed' as const,
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

  const pendingTeeth = Object.values(chart.teeth).filter(
    (t) => t.status === 'pending' || t.status === 'cavity' || t.procedures.some((p) => p.status !== 'completed')
  );

  const completedTeeth = Object.values(chart.teeth).filter(
    (t) => t.status === 'treated' || t.status === 'implant' || t.status === 'prosthesis'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.entries(TOOTH_STATUS_CONFIG).map(([status, config]) => (
          <Badge key={status} variant="outline" className={cn(config.bgColor, config.color, 'text-xs')}>
            {config.label}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-sm text-muted-foreground">Arcada Superior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-1">
            {ADULT_TEETH.upperRight.map((num) => (
              <Tooth
                key={num}
                tooth={chart.teeth[num]}
                onClick={() => handleToothClick(num)}
                position="upper"
              />
            ))}
            <div className="w-4" />
            {ADULT_TEETH.upperLeft.map((num) => (
              <Tooth
                key={num}
                tooth={chart.teeth[num]}
                onClick={() => handleToothClick(num)}
                position="upper"
              />
            ))}
          </div>

          <div className="border-t border-dashed border-border my-4" />

          <div className="flex justify-center gap-1">
            {ADULT_TEETH.lowerRight.map((num) => (
              <Tooth
                key={num}
                tooth={chart.teeth[num]}
                onClick={() => handleToothClick(num)}
                position="lower"
              />
            ))}
            <div className="w-4" />
            {ADULT_TEETH.lowerLeft.map((num) => (
              <Tooth
                key={num}
                tooth={chart.teeth[num]}
                onClick={() => handleToothClick(num)}
                position="lower"
              />
            ))}
          </div>
        </CardContent>
        <CardHeader className="pt-0 pb-4">
          <CardTitle className="text-center text-sm text-muted-foreground">Arcada Inferior</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <Clock className="h-4 w-4" />
              Procedimentos Pendentes ({pendingTeeth.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTeeth.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum procedimento pendente</p>
            ) : (
              <div className="space-y-2">
                {pendingTeeth.slice(0, 5).map((tooth) => (
                  <div key={tooth.number} className="flex items-center justify-between text-sm">
                    <span className="font-medium">Dente {tooth.number}</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700">
                      {TOOTH_STATUS_CONFIG[tooth.status].label}
                    </Badge>
                  </div>
                ))}
                {pendingTeeth.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{pendingTeeth.length - 5} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Check className="h-4 w-4" />
              Tratamentos Realizados ({completedTeeth.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTeeth.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum tratamento realizado</p>
            ) : (
              <div className="space-y-2">
                {completedTeeth.slice(0, 5).map((tooth) => (
                  <div key={tooth.number} className="flex items-center justify-between text-sm">
                    <span className="font-medium">Dente {tooth.number}</span>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                      {TOOTH_STATUS_CONFIG[tooth.status].label}
                    </Badge>
                  </div>
                ))}
                {completedTeeth.length > 5 && (
                  <p className="text-xs text-muted-foreground">+{completedTeeth.length - 5} mais</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
                              <Badge variant="outline" className="text-xs mt-1 bg-emerald-100 text-emerald-700">
                                Concluído
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
