import { useState } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  Wallet,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';

const steps = [
  {
    icon: Calendar,
    title: 'Agenda do dia a dia',
    description:
      'Organize consultas por profissional. Ao finalizar, escolha receber agora no Caixa ou lançar em Contas a receber.',
  },
  {
    icon: Users,
    title: 'Pacientes e odontograma',
    description:
      'Prontuário com histórico e odontograma. Marque o que é a realizar, já realizado ou pré-existente.',
  },
  {
    icon: DollarSign,
    title: 'Caixa (recepção)',
    description:
      'Recebimentos do dia, dinheiro, PIX e maquineta. Ideal para a recepção — sem misturar com relatórios.',
  },
  {
    icon: Wallet,
    title: 'Contas a receber (admin)',
    description:
      'Parcelas e cobranças futuras. A baixa gera o lançamento no Caixa automaticamente.',
  },
  {
    icon: Shield,
    title: 'Papéis e permissões',
    description:
      'Recepcionista usa Agenda + Caixa. Administrador vê Contas a receber, Relatórios e Administração. Ajuste em Administração → Permissões.',
  },
];

export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleComplete = async () => {
    try {
      await completeOnboarding();
    } catch {
      toast.error('Não foi possível salvar o onboarding, mas você já pode usar o sistema.');
    }
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <span className="text-lg font-semibold">Bem-vindo ao HealthCare</span>
        </div>

        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {currentStep.title}
        </h2>
        <p className="mb-8 text-muted-foreground">
          {currentStep.description}
        </p>

        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            Pular
          </Button>
          <Button onClick={handleNext}>
            {step < steps.length - 1 ? (
              <>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Começar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
