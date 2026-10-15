import { SmartHubLayout } from '@/components/smart-hub';
import { SmartHubFormConfigEditor } from '@/components/smart-hub/SmartHubFormConfigEditor';
import { useSmartHub } from '@/hooks/useSmartHub';

export default function SmartHubForm() {
  const { isLoading } = useSmartHub();

  return (
    <SmartHubLayout
      title="Formulário"
      description="Campos, perguntas e destino no CRM do formulário usado pelos botões do Smart Hub."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl rounded-lg border bg-card p-4 sm:p-6">
          <SmartHubFormConfigEditor />
        </div>
      )}
    </SmartHubLayout>
  );
}
