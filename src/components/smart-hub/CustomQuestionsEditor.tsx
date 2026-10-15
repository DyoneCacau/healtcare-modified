import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CUSTOM_QUESTION_LIMITS,
  CUSTOM_QUESTION_TYPE_LABELS,
  newCustomQuestionId,
  type CustomQuestion,
  type CustomQuestionType,
} from '@/services/smartHub/customQuestions';

interface CustomQuestionsEditorProps {
  value: CustomQuestion[];
  onChange: (next: CustomQuestion[]) => void;
  disabled?: boolean;
}

const TYPE_KEYS = Object.keys(CUSTOM_QUESTION_TYPE_LABELS) as CustomQuestionType[];

export function CustomQuestionsEditor({ value, onChange, disabled = false }: CustomQuestionsEditorProps) {
  const update = (index: number, patch: Partial<CustomQuestion>) => {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    onChange([
      ...value,
      { id: newCustomQuestionId(), label: '', type: 'text', required: false },
    ]);
  };

  const canAdd = value.length < CUSTOM_QUESTION_LIMITS.maxQuestions;

  return (
    <div className="space-y-3">
      <div>
        <Label>Perguntas personalizadas</Label>
        <p className="text-xs text-muted-foreground">
          Aparecem no formulário do Smart Hub e no cadastro de lead do CRM. As respostas vão para as
          observações do lead.
        </p>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhuma pergunta extra. O formulário usa só os campos padrão.
        </p>
      ) : null}

      {value.map((question, index) => (
        <div key={question.id} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Pergunta {index + 1}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Mover para cima"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={disabled || index === value.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Mover para baixo"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label="Remover pergunta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Input
            value={question.label}
            onChange={(e) => update(index, { label: e.target.value })}
            placeholder="Ex.: Já fez tratamento ortodôntico?"
            maxLength={CUSTOM_QUESTION_LIMITS.maxLabel}
            disabled={disabled}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={question.type}
              onValueChange={(v) => update(index, { type: v as CustomQuestionType })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {CUSTOM_QUESTION_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <Label className="text-sm font-normal">Obrigatória</Label>
              <Switch
                checked={question.required}
                onCheckedChange={(v) => update(index, { required: v })}
                disabled={disabled}
              />
            </div>
          </div>

          {question.type === 'select' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Opções (uma por linha)</Label>
              <Textarea
                value={(question.options ?? []).join('\n')}
                onChange={(e) => update(index, { options: e.target.value.split('\n') })}
                rows={3}
                placeholder={'Manhã\nTarde\nNoite'}
                disabled={disabled}
              />
            </div>
          ) : null}

          {question.type === 'text' || question.type === 'textarea' ? (
            <Input
              value={question.placeholder ?? ''}
              onChange={(e) => update(index, { placeholder: e.target.value })}
              placeholder="Texto de exemplo dentro do campo (opcional)"
              maxLength={CUSTOM_QUESTION_LIMITS.maxPlaceholder}
              disabled={disabled}
            />
          ) : null}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled || !canAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar pergunta
      </Button>
      {!canAdd ? (
        <p className="text-xs text-muted-foreground">
          Limite de {CUSTOM_QUESTION_LIMITS.maxQuestions} perguntas.
        </p>
      ) : null}
    </div>
  );
}
