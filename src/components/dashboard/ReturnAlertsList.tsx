import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, MessageCircle, Check, Calendar, User, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReturnAlerts } from '@/hooks/useReturnAlerts';
import { generateReturnMessage, generateWhatsAppUrl } from '@/utils/whatsapp';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export function ReturnAlertsList() {
  const { alerts, isLoading, markContacted } = useReturnAlerts();

  const handleWhatsApp = (alert: (typeof alerts)[0]) => {
    if (!alert.patientPhone) {
      toast.error('Paciente sem telefone cadastrado');
      return;
    }
    const message = generateReturnMessage(
      alert.patientName,
      alert.procedure,
      alert.clinicName,
      alert.clinicPhone || undefined
    );
    const url = generateWhatsAppUrl(alert.patientPhone, message);
    window.open(url, '_blank');
  };

  const handleCall = (alert: (typeof alerts)[0]) => {
    if (!alert.patientPhone) {
      toast.error('Paciente sem telefone cadastrado');
      return;
    }
    const digits = alert.patientPhone.replace(/\D/g, '');
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    window.open(`tel:+${phone}`, '_self');
  };

  const handleMarkContacted = async (id: string) => {
    try {
      await markContacted.mutateAsync(id);
      toast.success('Marcado como contactado');
    } catch {
      toast.error('Erro ao marcar');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Alertas de Retorno</h3>
          <p className="text-sm text-muted-foreground">
            Pacientes para contato pós-consulta
          </p>
        </div>
        <div className="divide-y divide-border p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Alertas de Retorno</h3>
        <p className="text-sm text-muted-foreground">
          Pacientes para contato pós-consulta (7 a 60 dias)
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum alerta de retorno</p>
          <p className="text-xs text-muted-foreground mt-1">
            Consultas finalizadas há 7+ dias aparecem aqui
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <User className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {alert.patientName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {alert.procedure} • {format(new Date(alert.date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/agenda?patientId=${alert.patientId}&procedure=Retorno&fromAlert=1`}
                    title="Agendar retorno"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </Link>
                  {alert.patientPhone ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCall(alert)}
                        title="Ligar"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => handleWhatsApp(alert)}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem telefone</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMarkContacted(alert.id)}
                    title="Marcar como contactado"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <Link
              to="/agenda"
              className="w-full block text-center text-sm font-medium text-primary hover:underline"
            >
              Ver agenda
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
