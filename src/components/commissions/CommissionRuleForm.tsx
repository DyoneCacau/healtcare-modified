import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  CommissionRule, 
  DayOfWeek, 
  CalculationType, 
  CalculationUnit,
  BeneficiaryType,
  daysOfWeekLabels,
  calculationUnitLabels,
  beneficiaryTypeLabels,
  calculateAutoPriority,
} from '@/types/commission';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useClinics } from '@/hooks/useClinic';

const formSchema = z.object({
  clinicId: z.string().min(1, 'Selecione uma clínica'),
  beneficiaryType: z.enum(['professional', 'seller', 'reception']),
  professionalId: z.string().min(1, 'Selecione um profissional'),
  beneficiaryId: z.string().optional(),
  procedure: z.string().min(1, 'Selecione um procedimento'),
  dayOfWeek: z.string().min(1, 'Selecione o dia'),
  calculationType: z.enum(['percentage', 'fixed']),
  calculationUnit: z.enum(['appointment', 'ml', 'arch', 'unit', 'session']),
  value: z.number().min(0.01, 'Valor deve ser maior que zero'),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Common dental procedures
const PROCEDURES = [
  'Consulta',
  'Limpeza',
  'Clareamento',
  'Restauração',
  'Extração',
  'Canal',
  'Implante',
  'Prótese',
  'Ortodontia',
  'Periodontia',
];

interface CommissionRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingRule?: CommissionRule | null;
  selectedClinicId?: string;
}

export function CommissionRuleForm({
  open,
  onOpenChange,
  onSave,
  editingRule,
  selectedClinicId,
}: CommissionRuleFormProps) {
  const [selectedClinic, setSelectedClinic] = useState(selectedClinicId || '');
  const { professionals } = useProfessionals();
  const { clinics } = useClinics();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clinicId: selectedClinicId || '',
      beneficiaryType: 'professional',
      professionalId: 'all',
      beneficiaryId: '',
      procedure: 'all',
      dayOfWeek: 'all',
      calculationType: 'percentage',
      calculationUnit: 'appointment',
      value: 30,
      isActive: true,
      notes: '',
    },
  });

  useEffect(() => {
    if (editingRule) {
      form.reset({
        clinicId: editingRule.clinicId,
        beneficiaryType: editingRule.beneficiaryType,
        professionalId: editingRule.professionalId,
        beneficiaryId: editingRule.beneficiaryId || '',
        procedure: editingRule.procedure,
        dayOfWeek: editingRule.dayOfWeek,
        calculationType: editingRule.calculationType,
        calculationUnit: editingRule.calculationUnit,
        value: editingRule.value,
        isActive: editingRule.isActive,
        notes: editingRule.notes || '',
      });
      setSelectedClinic(editingRule.clinicId);
    } else {
      form.reset({
        clinicId: selectedClinicId || '',
        beneficiaryType: 'professional',
        professionalId: 'all',
        beneficiaryId: '',
        procedure: 'all',
        dayOfWeek: 'all',
        calculationType: 'percentage',
        calculationUnit: 'appointment',
        value: 30,
        isActive: true,
        notes: '',
      });
      setSelectedClinic(selectedClinicId || '');
    }
  }, [editingRule, selectedClinicId, form]);

  const watchCalculationType = form.watch('calculationType');
  const watchCalculationUnit = form.watch('calculationUnit');
  const watchBeneficiaryType = form.watch('beneficiaryType');

  // Calculate preview priority
  const formValues = form.watch();
  const previewPriority = calculateAutoPriority({
    professionalId: formValues.professionalId,
    procedure: formValues.procedure,
    dayOfWeek: formValues.dayOfWeek as DayOfWeek,
    beneficiaryId: formValues.beneficiaryId,
  });

  const handleSubmit = (values: FormValues) => {
    const professional = professionals.find(p => p.id === values.beneficiaryId);
    
    onSave({
      clinicId: values.clinicId,
      professionalId: values.professionalId as string | 'all',
      beneficiaryType: values.beneficiaryType as BeneficiaryType,
      beneficiaryId: values.beneficiaryId || undefined,
      beneficiaryName: professional?.name,
      procedure: values.procedure as string | 'all',
      dayOfWeek: values.dayOfWeek as DayOfWeek,
      calculationType: values.calculationType as CalculationType,
      calculationUnit: values.calculationUnit as CalculationUnit,
      value: values.value,
      priority: previewPriority,
      isActive: values.isActive,
      notes: values.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clínica</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setSelectedClinic(v);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a clínica" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beneficiaryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Beneficiário</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(beneficiaryTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Profissional, vendedor ou recepção que receberá a comissão
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professionalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os Profissionais</SelectItem>
                        {professionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchBeneficiaryType !== 'professional' && (
                <FormField
                  control={form.control}
                  name="beneficiaryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchBeneficiaryType === 'seller' ? 'Vendedor' : 'Recepcionista'}
                      </FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="procedure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos os Procedimentos</SelectItem>
                      {PROCEDURES.map((proc) => (
                        <SelectItem key={proc} value={proc}>
                          {proc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia da Semana</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(daysOfWeekLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Aplica a regra apenas no dia selecionado
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calculationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cálculo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calculationUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Cálculo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(calculationUnitLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchCalculationType === 'percentage' ? 'Percentual' : 'Valor'}
                    {watchCalculationType === 'fixed' && watchCalculationUnit !== 'appointment' && (
                      <span className="text-muted-foreground ml-1">
                        (por {calculationUnitLabels[watchCalculationUnit].replace('Por ', '').toLowerCase()})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step={watchCalculationType === 'percentage' ? '1' : '0.01'}
                        min="0"
                        max={watchCalculationType === 'percentage' ? '100' : undefined}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className={watchCalculationType === 'percentage' ? 'pr-8' : 'pl-9'}
                      />
                      {watchCalculationType === 'percentage' ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      ) : (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          R$
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto Priority Preview */}
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Prioridade Automática</p>
                <p className="text-xs text-muted-foreground">
                  Calculada com base na especificidade da regra
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-lg">
                {previewPriority}
              </Badge>
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Regra Ativa</FormLabel>
                    <FormDescription>
                      Regras inativas não são aplicadas nos cálculos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre esta regra..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
