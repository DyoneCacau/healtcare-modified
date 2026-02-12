import { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  Building2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient } from '@/types/patient';
import { AppointmentWithClinic } from '@/types/clinic';
import { DentalChart as DentalChartType } from '@/types/dental';
import { DentalChart } from './DentalChart';
import { useDentalChart, useDentalChartMutations } from '@/hooks/useDentalCharts';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  appointments: AppointmentWithClinic[];
}

const getStatusConfig = (status: AppointmentWithClinic['status']) => {
  switch (status) {
    case 'completed':
      return { label: 'Conclu\u00edda', icon: CheckCircle, className: 'bg-success text-success-foreground' };
    case 'confirmed':
      return { label: 'Confirmada', icon: Clock, className: 'bg-primary text-primary-foreground' };
    case 'pending':
      return { label: 'Pendente', icon: Timer, className: 'bg-warning text-warning-foreground' };
    case 'cancelled':
      return { label: 'Cancelada', icon: XCircle, className: 'bg-destructive text-destructive-foreground' };
    default:
      return { label: status, icon: Clock, className: 'bg-muted text-muted-foreground' };
  }
};

export const PatientDetailsDialog = ({
  open,
  onOpenChange,
  patient,
  appointments,
}: PatientDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('info');
  const { chart } = useDentalChart(patient?.id);
  const { updateChart } = useDentalChartMutations();

  if (!patient) return null;

  const handleUpdateChart = (updatedChart: DentalChartType) => {
    if (patient?.id) {
      updateChart.mutate({ patientId: patient.id, chart: updatedChart });
    }
  };

  const age = differenceInYears(new Date(), parseISO(patient.birthDate));
  const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );

  // Group appointments by clinic
  const clinicsSet = new Set(appointments.map((a) => a.clinic.id));
  const totalClinics = clinicsSet.size;
  const dentalProcedures =
    chart
      ? Object.values(chart.teeth)
          .flatMap((tooth) =>
            tooth.procedures.map((proc) => ({
              ...proc,
              toothNumber: tooth.number,
            }))
          )
          .filter((proc) => !proc.appointmentId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div>
              <DialogTitle className="text-xl">{patient.name}</DialogTitle>
              <p className="text-muted-foreground">
                {age} anos - CPF: {patient.cpf}
              </p>
            </div>
            <Badge
              variant={patient.status === 'active' ? 'default' : 'secondary'}
              className={`ml-auto ${patient.status === 'active' ? 'bg-success hover:bg-success/90' : ''}`}
            >
              {patient.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 pb-6">
            <TabsList className="w-full flex flex-wrap gap-2">
            <TabsTrigger value="info" className="flex-1 min-w-[140px]">
              Informações
            </TabsTrigger>
            <TabsTrigger value="dental" className="flex-1 min-w-[140px]">
              Odontograma
            </TabsTrigger>
            <TabsTrigger value="clinical" className="flex-1 min-w-[140px]">
              Dados Clínicos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-[140px]">
              Histórico
            </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.email || 'Não informado'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{patient.address || 'Não informado'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Nascimento:{' '}
                      {format(parseISO(patient.birthDate), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Idade: {age} anos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Cadastro:{' '}
                      {format(parseISO(patient.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{appointments.length}</p>
                      <p className="text-sm text-muted-foreground">Total de Consultas</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-success">{completedAppointments}</p>
                      <p className="text-sm text-muted-foreground">Realizadas</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-warning">{upcomingAppointments.length}</p>
                      <p className="text-sm text-muted-foreground">Agendadas</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-info">{totalClinics}</p>
                      <p className="text-sm text-muted-foreground">Clínicas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </TabsContent>

            <TabsContent value="dental" className="mt-4">
              <div className="pr-2">
              {chart && (
                <DentalChart
                  chart={chart}
                  onUpdateChart={handleUpdateChart}
                />
              )}
              </div>
            </TabsContent>

            <TabsContent value="clinical" className="mt-4">
            <div className="space-y-4">
              {patient.allergies.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Alergias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Observações Clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {patient.clinicalNotes || 'Nenhuma observa\u00e7\u00e3o cl\u00ednica registrada.'}
                  </p>
                </CardContent>
              </Card>
            </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {appointments.length === 0 && dentalProcedures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma consulta registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.length > 0 && (
                      <div className="space-y-3">
                        {appointments
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((appointment) => {
                            const statusConfig = getStatusConfig(appointment.status);
                            const StatusIcon = statusConfig.icon;
                            
                            return (
                              <Card key={appointment.id} className="overflow-hidden">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{appointment.procedure}</span>
                                        <Badge className={statusConfig.className}>
                                          <StatusIcon className="h-3 w-3 mr-1" />
                                          {statusConfig.label}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {appointment.professional}
                                      </p>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Building2 className="h-3 w-3" />
                                        {appointment.clinic.name}
                                      </div>
                                      {appointment.notes && (
                                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                          {appointment.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right text-sm">
                                      <p className="font-medium">
                                        {format(parseISO(appointment.date), "dd 'de' MMM", {
                                          locale: ptBR,
                                        })}
                                      </p>
                                      <p className="text-muted-foreground">{appointment.time}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}

                    {dentalProcedures.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Procedimentos do Odontograma
                        </p>
                        {dentalProcedures.map((proc) => (
                          <Card key={proc.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{proc.procedure}</span>
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">
                                      Concluído
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {proc.professional}
                                  </p>
                                  <div className="text-xs text-muted-foreground">
                                    Dente {proc.toothNumber}
                                  </div>
                                  {proc.notes && (
                                    <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                      {proc.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-sm">
                                  <p className="font-medium">
                                    {format(parseISO(proc.date), "dd 'de' MMM", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
