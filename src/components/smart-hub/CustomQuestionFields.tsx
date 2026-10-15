import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { questionOptions, type CustomQuestion } from '@/services/smartHub/customQuestions';

interface CustomQuestionFieldsProps {
  questions: CustomQuestion[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  disabled?: boolean;
  /** Mostra o * nas obrigatórias (desligado no CRM, onde as respostas são opcionais). */
  showRequired?: boolean;
  idPrefix?: string;
}

export function CustomQuestionFields({
  questions,
  values,
  onChange,
  disabled = false,
  showRequired = true,
  idPrefix = 'cq',
}: CustomQuestionFieldsProps) {
  return (
    <>
      {questions.map((question) => {
        const fieldId = `${idPrefix}-${question.id}`;
        const value = values[question.id] ?? '';
        const label = (
          <Label htmlFor={fieldId}>
            {question.label}
            {showRequired && question.required ? ' *' : ''}
          </Label>
        );

        if (question.type === 'textarea') {
          return (
            <div key={question.id} className="space-y-1.5">
              {label}
              <Textarea
                id={fieldId}
                value={value}
                onChange={(e) => onChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                rows={3}
                disabled={disabled}
              />
            </div>
          );
        }

        if (question.type === 'select' || question.type === 'yes_no') {
          const options = questionOptions(question);
          return (
            <div key={question.id} className="space-y-1.5">
              {label}
              <RadioGroup
                id={fieldId}
                value={value}
                onValueChange={(v) => onChange(question.id, v)}
                disabled={disabled}
                className={question.type === 'yes_no' ? 'flex gap-4' : undefined}
              >
                {options.map((option, index) => {
                  const optionId = `${fieldId}-${index}`;
                  return (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem id={optionId} value={option} />
                      <Label htmlFor={optionId} className="font-normal">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          );
        }

        return (
          <div key={question.id} className="space-y-1.5">
            {label}
            <Input
              id={fieldId}
              value={value}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              disabled={disabled}
            />
          </div>
        );
      })}
    </>
  );
}
