import { useState } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  Stethoscope,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';

const steps = [
  {
    icon: Calendar,
    title: 'Agenda completa',
    description: 'Visualize dia, semana ou mês. Confirme consultas e envie lembretes por WhatsApp.',
  },
  {
    icon: Users,
    title: 'Pacientes e odontograma',
    description: 'Prontuário completo com histórico de tratamentos e odontograma visual.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro e comissões',
    description: 'Controle caixa, sangrias, receitas e despesas. Cálculo automático de comissões.',
  },
  {
    icon: Stethoscope,
    title: 'Profissionais e relatórios',
    description: 'Gerencie equipe, ponto eletrônico e acompanhe métricas em tempo real.',
  },
];

export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
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

        {/* Progress dots */}
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
