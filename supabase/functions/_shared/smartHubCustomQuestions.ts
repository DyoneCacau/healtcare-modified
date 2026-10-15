/**
 * Perguntas personalizadas do formulário do Smart Hub (capture_config.custom_questions).
 * Fonte única: usada pela Edge `smart-hub-capture`, pelo formulário público,
 * pelo editor do Smart Hub e pelo cadastro manual de lead no CRM.
 */

export type CustomQuestionType = 'text' | 'textarea' | 'select' | 'yes_no';

export interface CustomQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CustomAnswer {
  id: string;
  label: string;
  answer: string;
}

export const CUSTOM_QUESTION_LIMITS = {
  maxQuestions: 15,
  maxLabel: 200,
  maxPlaceholder: 120,
  maxOptions: 20,
  maxOption: 100,
  maxAnswer: 1000,
} as const;

export const CUSTOM_QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  text: 'Resposta curta',
  textarea: 'Resposta longa',
  select: 'Múltipla escolha',
  yes_no: 'Sim / Não',
};

export const YES_NO_OPTIONS = ['Sim', 'Não'] as const;

const TYPES = new Set<CustomQuestionType>(['text', 'textarea', 'select', 'yes_no']);
const ID_RE = /^[a-zA-Z0-9_-]{1,40}$/;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function newCustomQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

export function questionOptions(question: CustomQuestion): string[] {
  if (question.type === 'yes_no') return [...YES_NO_OPTIONS];
  if (question.type === 'select') return question.options ?? [];
  return [];
}

/** Sanitiza a lista salva/recebida; descarta perguntas sem texto ou escolha sem opções. */
export function normalizeCustomQuestions(raw: unknown): CustomQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomQuestion[] = [];

  for (const item of raw) {
    if (out.length >= CUSTOM_QUESTION_LIMITS.maxQuestions) break;
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;

    const label = cleanText(q.label, CUSTOM_QUESTION_LIMITS.maxLabel);
    if (!label) continue;

    const type = TYPES.has(q.type as CustomQuestionType) ? (q.type as CustomQuestionType) : 'text';
    let id = typeof q.id === 'string' && ID_RE.test(q.id) ? q.id : '';
    if (!id || seen.has(id)) id = `q_${out.length + 1}_${seen.size}`;
    seen.add(id);

    const question: CustomQuestion = { id, label, type, required: q.required === true };

    if (type === 'select') {
      const options = Array.isArray(q.options)
        ? [...new Set(
            q.options
              .map((o) => cleanText(o, CUSTOM_QUESTION_LIMITS.maxOption))
              .filter(Boolean),
          )].slice(0, CUSTOM_QUESTION_LIMITS.maxOptions)
        : [];
      if (options.length < 2) continue;
      question.options = options;
    }

    if (type === 'text' || type === 'textarea') {
      const placeholder = cleanText(q.placeholder, CUSTOM_QUESTION_LIMITS.maxPlaceholder);
      if (placeholder) question.placeholder = placeholder;
    }

    out.push(question);
  }
  return out;
}

/** Problemas que impedem salvar o editor (mensagens para o administrador). */
export function customQuestionsIssues(raw: CustomQuestion[]): string[] {
  const issues: string[] = [];
  if (raw.length > CUSTOM_QUESTION_LIMITS.maxQuestions) {
    issues.push(`Máximo de ${CUSTOM_QUESTION_LIMITS.maxQuestions} perguntas.`);
  }
  raw.forEach((q, index) => {
    const n = index + 1;
    if (!cleanText(q.label, CUSTOM_QUESTION_LIMITS.maxLabel)) {
      issues.push(`Pergunta ${n}: escreva o texto da pergunta.`);
    }
    if (q.type === 'select') {
      const options = (q.options ?? []).map((o) => cleanText(o, CUSTOM_QUESTION_LIMITS.maxOption)).filter(Boolean);
      if (new Set(options).size < 2) {
        issues.push(`Pergunta ${n}: informe pelo menos 2 opções.`);
      }
    }
  });
  return issues;
}

/**
 * Valida respostas recebidas contra as perguntas configuradas.
 * Respostas de escolha fora das opções são ignoradas.
 */
export function collectCustomAnswers(
  questions: CustomQuestion[],
  rawAnswers: unknown,
): { answers: CustomAnswer[]; missing: CustomQuestion[] } {
  const source =
    rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : {};
  const answers: CustomAnswer[] = [];
  const missing: CustomQuestion[] = [];

  for (const question of questions) {
    let answer =
      typeof source[question.id] === 'string'
        ? (source[question.id] as string).trim().slice(0, CUSTOM_QUESTION_LIMITS.maxAnswer)
        : '';
    const options = questionOptions(question);
    if (answer && options.length > 0 && !options.includes(answer)) answer = '';

    if (answer) answers.push({ id: question.id, label: question.label, answer });
    else if (question.required) missing.push(question);
  }
  return { answers, missing };
}

/** Bloco legível gravado nas observações do lead. */
export function formatCustomAnswersNotes(answers: CustomAnswer[]): string | null {
  if (answers.length === 0) return null;
  return ['Respostas do formulário:', ...answers.map((a) => `- ${a.label}: ${a.answer}`)].join('\n');
}
