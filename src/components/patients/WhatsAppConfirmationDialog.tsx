import { useState } from 'react';
import { MessageSquare, Send, Building2, Calendar, Clock, User, MapPin, Edit3, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient } from '@/types/patient';
import { AppointmentWithClinic } from '@/types/clinic';
import { prepareWhatsAppMessage, generateConfirmationMessage } from '@/utils/whatsapp';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface WhatsAppConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  appointments: AppointmentWithClinic[];
}

export const WhatsAppConfirmationDialog = ({
  open,
  onOpenChange,
  patient,
  appointments,
}: WhatsAppConfirmationDialogProps) => {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  if (!patient) return null;

  // Filter only upcoming appointments (confirmed or pending)
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );

  // Group appointments by clinic
  const appointmentsByClinic = upcomingAppointments.reduce((acc, appointment) => {
    const clinicId = appointment.clinic.id;
    if (!acc[clinicId]) {
      acc[clinicId] = {
        clinic: appointment.clinic,
        appointments: [],
      };
    }
    acc[clinicId].appointments.push(appointment);
    return acc;
  }, {} as Record<string, { clinic: AppointmentWithClinic['clinic']; appointments: AppointmentWithClinic[] }>);

  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId);

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (appointment && patient) {
      const message = generateConfirmationMessage(patient, appointment);
      setCustomMessage(message);
      setIsEditing(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedAppointment || !patient) {
      toast.error('Selecione uma consulta para enviar a confirmação');
      return;
    }

    const { whatsappUrl } = prepareWhatsAppMessage(patient, selectedAppointment);
    
    // If message was customized, use custom URL
    if (isEditing && customMessage !== generateConfirmationMessage(patient, selectedAppointment)) {
      const encodedMessage = encodeURIComponent(customMessage);
      const formattedPhone = patient.phone.replace(/\D/g, '');
      const customUrl = `https://wa.me/55${formattedPhone}?text=${encodedMessage}`;
      window.open(customUrl, '_blank');
    } else {
      window.open(whatsappUrl, '_blank');
    }
    
    toast.success('Abrindo WhatsApp...', {
      description: `Mensagem preparada para ${patient.name}`,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-success" />
            Confirmar Consulta via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem de confirmação de consulta para {patient.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-6 pb-4">
          {/* Patient Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-semibold text-primary">
                {patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div>
              <p className="font-medium">{patient.name}</p>
              <p className="text-sm text-muted-foreground">{patient.phone}</p>
            </div>
          </div>

          {/* Appointment Selection */}
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma consulta agendada</p>
              <p className="text-sm">Este paciente não possui consultas pendentes ou confirmadas.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Selecione a Consulta</Label>
                <ScrollArea className="h-[200px] pr-2">
                  <div className="space-y-4">
                    {Object.values(appointmentsByClinic).map(({ clinic, appointments: clinicAppointments }) => (
                      <div key={clinic.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          {clinic.name}
                        </div>
                        <div className="space-y-2 pl-6">
                          {clinicAppointments.map((appointment) => (
                            <Card
                              key={appointment.id}
                              className={`cursor-pointer transition-all ${
                                selectedAppointmentId === appointment.id
                                  ? 'ring-2 ring-primary bg-primary/5'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => handleSelectAppointment(appointment.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{appointment.procedure}</span>
                                      <Badge
                                        variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                                        className={appointment.status === 'confirmed' ? 'bg-primary' : 'bg-warning'}
                                      >
                                        {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(parseISO(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {appointment.time}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {appointment.professional}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Message Preview/Edit */}
              {selectedAppointment && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Mensagem</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? 'Ver Preview' : 'Editar'}
                    </Button>
                  </div>
                  
                  {isEditing ? (
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg max-h-[200px] overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {customMessage}
                      </pre>
                    </div>
                  )}

                  {/* Clinic Info */}
                  <div className="p-3 bg-accent/50 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium">{selectedAppointment.clinic.name}</p>
                        <p className="text-muted-foreground">{selectedAppointment.clinic.address}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={!selectedAppointment}
            className="gap-2 bg-success hover:bg-success/90"
          >
            <Send className="h-4 w-4" />
            Enviar pelo WhatsApp
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
