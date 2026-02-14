import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, Users, CreditCard, Check, X } from 'lucide-react';
import { useClinics } from '@/hooks/useClinic';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MyClinicsContent() {
  const { clinics, isLoading } = useClinics();
  const { subscription, plan } = useSubscription();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Carregando...</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Gerencie as clínicas que você administra
      </p>

      {subscription && plan && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">Plano Atual: {plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {subscription.status === 'active' ? (
                    <>
                      Próxima cobrança em{' '}
                      {subscription.current_period_end
                        ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Data não disponível'}
                    </>
                  ) : (
                    'Assinatura inativa'
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {plan.max_clinics && (
                    <Badge variant="outline">
                      <Building2 className="h-3 w-3 mr-1" />
                      {clinics.length} / {plan.max_clinics === 999 ? '∞' : plan.max_clinics} clínicas
                    </Badge>
                  )}
                </div>
              </div>
              <CreditCard className="h-12 w-12 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clinics.map((clinic) => (
          <Card key={clinic.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-lg">{clinic.name}</span>
                </div>
                <Badge variant={clinic.is_active ? 'default' : 'secondary'}>
                  {clinic.is_active ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Ativa
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Inativa
                    </>
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(clinic.phone || clinic.email) && (
                <div className="space-y-2">
                  {clinic.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{clinic.phone}</span>
                    </div>
                  )}
                  {clinic.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{clinic.email}</span>
                    </div>
                  )}
                </div>
              )}

              {clinic.address && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Endereço:</span>
                  <p className="font-medium mt-1 text-muted-foreground">
                    {clinic.address}
                    {clinic.city && `, ${clinic.city}`}
                    {clinic.state && ` - ${clinic.state}`}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Horário de Atendimento
                  </span>
                </div>
                {clinic.opening_time && clinic.closing_time && (
                  <p className="text-sm font-medium">
                    {clinic.opening_time} - {clinic.closing_time}
                  </p>
                )}
                {clinic.appointment_duration && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duração Consulta:</span>
                    <span className="font-medium">{clinic.appointment_duration} min</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Usuários</span>
                  </div>
                  <p className="text-2xl font-bold">{clinic.user_count || 0}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Criada em</span>
                  </div>
                  <p className="text-sm font-medium">
                    {clinic.created_at
                      ? format(new Date(clinic.created_at), 'MMM yyyy', { locale: ptBR })
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clinics.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhuma clínica encontrada</h3>
              <p className="text-muted-foreground">
                Você ainda não possui clínicas cadastradas no sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
