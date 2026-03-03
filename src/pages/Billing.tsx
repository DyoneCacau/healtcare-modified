import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function Billing() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Gestão de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              A gestão de pagamentos e assinaturas é realizada manualmente pelo administrador 
              da plataforma.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Para qualquer alteração em seu plano, módulos contratados ou questões relacionadas 
              a pagamento, entre em contato com nosso suporte.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-medium">
                Contato: {import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@octupuzz.com.br'}
              </p>
              <p className="text-sm font-medium">
                WhatsApp: {import.meta.env.VITE_SUPPORT_WHATSAPP || '(11) 99999-9999'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
