import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedClinicId } from "@/hooks/useSelectedClinicId";
import { toast } from "sonner";

interface UserClinic {
  clinic_id: string;
  clinic_name: string;
  is_owner: boolean;
  role: string;
  is_preferred: boolean;
}

export function ClinicSelector() {
  const [clinics, setClinics] = useState<UserClinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClinicId, setSelectedClinicIdLocal] = useState<string | null>(null);
  const { setSelectedClinicId } = useSelectedClinicId();
  const navigate = useNavigate();

  const handleSelectClinic = useCallback(
    async (clinicId: string) => {
      try {
        setSelectedClinicId(clinicId);
        navigate('/app', { replace: true });
      } catch (error) {
        console.error("Erro ao selecionar clínica:", error);
        toast.error("Erro ao acessar clínica");
      }
    },
    [navigate, setSelectedClinicId]
  );

  useEffect(() => {
    async function fetchUserClinics() {
      try {
        const { data, error } = await supabase.rpc('get_user_clinics');

        if (error) {
          // Fallback se a RPC não existir no banco remoto
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw error;

          const { data: links, error: linksError } = await supabase
            .from('clinic_users')
            .select('clinic_id, is_owner, clinics(id, name)')
            .eq('user_id', user.id);

          if (linksError) throw linksError;

          const { data: roleRow } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

          const systemRole = roleRow?.role || 'receptionist';

          const mapped: UserClinic[] = (links || []).map((row) => ({
            clinic_id: row.clinic_id,
            clinic_name: (row.clinics as { name?: string } | null)?.name || 'Clínica',
            is_owner: row.is_owner,
            role: systemRole,
            is_preferred: false,
          }));

          setClinics(mapped);

          if (mapped.length === 1) {
            await handleSelectClinic(mapped[0].clinic_id);
          }
          return;
        }

        setClinics(data || []);

        if (data && data.length === 1) {
          await handleSelectClinic(data[0].clinic_id);
          return;
        }

        const preferred = data?.find((c: UserClinic) => c.is_preferred);
        if (preferred) {
          setSelectedClinicIdLocal(preferred.clinic_id);
        }
      } catch (error) {
        console.error("Erro ao carregar clínicas:", error);
        toast.error("Erro ao carregar suas clínicas");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserClinics();
  }, [handleSelectClinic]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground">
            Selecione a clínica que deseja acessar
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clinics.map((clinic) => (
            <Card
              key={clinic.clinic_id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedClinicId === clinic.clinic_id
                  ? 'ring-2 ring-primary shadow-lg'
                  : ''
              }`}
              onClick={() => setSelectedClinicIdLocal(clinic.clinic_id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Building2 className="h-8 w-8 text-primary mb-2" />
                  {clinic.is_preferred && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Preferida
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{clinic.clinic_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Badge variant={clinic.is_owner ? "default" : "outline"}>
                      {clinic.is_owner ? "Proprietário" : "Colaborador"}
                    </Badge>
                    {!clinic.is_owner && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {clinic.role === 'admin' ? 'Administrador' :
                         clinic.role === 'receptionist' ? 'Recepcionista' :
                         clinic.role === 'seller' ? 'Vendedor' : 'Profissional'}
                      </span>
                    )}
                  </div>
                  {selectedClinicId === clinic.clinic_id && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClinic(clinic.clinic_id);
                      }}
                    >
                      Acessar
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedClinicId && (
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              className="gradient-primary"
              onClick={() => handleSelectClinic(selectedClinicId)}
            >
              Acessar Clínica Selecionada
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {clinics.length === 0 && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Nenhuma clínica encontrada</CardTitle>
              <CardDescription>
                Você não está vinculado a nenhuma clínica.
                <br />
                Entre em contato com o administrador.
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
