import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateInput } from '@/components/ui/date-input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useProfessionals } from '@/hooks/useProfessionals';
import {
  PatientEvolution,
  usePatientEvolutionMutations,
  usePatientEvolutions,
} from '@/hooks/usePatientEvolutions';

interface PatientEvolutionsTabProps {
  patientId: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function PatientEvolutionsTab({ patientId }: PatientEvolutionsTabProps) {
  const { evolutions, isLoading } = usePatientEvolutions(patientId);
  const { createEvolution, updateEvolution, deleteEvolution } = usePatientEvolutionMutations(patientId);
  const { activeProfessionals } = useProfessionals();

  const [professionalId, setProfessionalId] = useState('');
  const [evolutionDate, setEvolutionDate] = useState(todayIso());
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfessionals.length > 0 && !professionalId) {
      setProfessionalId(activeProfessionals[0].id);
    }
  }, [activeProfessionals, professionalId]);

  const selectedProfessional = activeProfessionals.find((p) => p.id === professionalId);
  const professionalName = selectedProfessional?.name || '';

  const resetForm = () => {
    setEditingId(null);
    setContent('');
    setEvolutionDate(todayIso());
    if (activeProfessionals[0]) {
      setProfessionalId(activeProfessionals[0].id);
    }
  };

  const handleEdit = (evolution: PatientEvolution) => {
    setEditingId(evolution.id);
    setContent(evolution.content);
    setEvolutionDate(evolution.evolutionDate);
    if (evolution.professionalId) {
      setProfessionalId(evolution.professionalId);
    }
  };

  const handleSave = () => {
    if (!content.trim()) return;

    if (editingId) {
      updateEvolution.mutate(
        {
          id: editingId,
          content,
          evolutionDate,
          professionalId: professionalId || null,
          professionalName,
        },
        { onSuccess: () => resetForm() }
      );
      return;
    }

    createEvolution.mutate(
      {
        content,
        evolutionDate,
        professionalId: professionalId || null,
        professionalName,
      },
      { onSuccess: () => resetForm() }
    );
  };

  const isSaving = createEvolution.isPending || updateEvolution.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {editingId ? 'Editar evolução' : 'Nova evolução'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {activeProfessionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <DateInput value={evolutionDate} onChange={setEvolutionDate} showCalendar />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Evolução do tratamento</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva a evolução do tratamento desse paciente"
              className="min-h-[120px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={!content.trim() || isSaving || !professionalName}>
              <Plus className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Registrar evolução'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                Cancelar edição
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Histórico de evoluções</h3>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : evolutions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma evolução registrada para este paciente.
            </CardContent>
          </Card>
        ) : (
          evolutions.map((evolution) => (
            <Card key={evolution.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {format(parseISO(evolution.evolutionDate), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {evolution.professionalName || 'Profissional não informado'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(evolution)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(evolution.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{evolution.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro do histórico clínico do paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteEvolution.mutate(deleteId, {
                    onSuccess: () => {
                      if (editingId === deleteId) resetForm();
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
