import { describe, expect, it } from 'vitest';
import {
  collectCustomAnswers,
  customQuestionsIssues,
  formatCustomAnswersNotes,
  normalizeCustomQuestions,
  resolveCaptureConfig,
  sanitizePublicCaptureConfig,
  type CustomQuestion,
} from '@/services/smartHub';

describe('normalizeCustomQuestions', () => {
  it('descarta perguntas sem texto e escolha com menos de 2 opções', () => {
    const out = normalizeCustomQuestions([
      { id: 'a', label: '  ', type: 'text' },
      { id: 'b', label: 'Período', type: 'select', options: ['Manhã', ''] },
      { id: 'c', label: 'Já usou aparelho?', type: 'yes_no', required: true },
      { id: 'd', label: 'Turno', type: 'select', options: ['Manhã', 'Tarde', 'Manhã', ' '] },
    ]);
    expect(out).toEqual([
      { id: 'c', label: 'Já usou aparelho?', type: 'yes_no', required: true },
      { id: 'd', label: 'Turno', type: 'select', required: false, options: ['Manhã', 'Tarde'] },
    ]);
  });

  it('aceita lixo sem quebrar e corrige tipo/id inválidos', () => {
    expect(normalizeCustomQuestions(null)).toEqual([]);
    expect(normalizeCustomQuestions('x')).toEqual([]);
    const [q] = normalizeCustomQuestions([{ id: 'id com espaço', label: 'Idade', type: 'nope' }]);
    expect(q.type).toBe('text');
    expect(q.id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('limita a 15 perguntas', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, label: `P${i}`, type: 'text' }));
    expect(normalizeCustomQuestions(many)).toHaveLength(15);
  });
});

describe('customQuestionsIssues', () => {
  it('aponta pergunta vazia e escolha sem opções', () => {
    const issues = customQuestionsIssues([
      { id: 'a', label: '', type: 'text', required: false },
      { id: 'b', label: 'Turno', type: 'select', required: false, options: ['Manhã', ''] },
    ]);
    expect(issues).toEqual([
      'Pergunta 1: escreva o texto da pergunta.',
      'Pergunta 2: informe pelo menos 2 opções.',
    ]);
  });
});

describe('collectCustomAnswers', () => {
  const questions: CustomQuestion[] = [
    { id: 'a', label: 'Já usou aparelho?', type: 'yes_no', required: true },
    { id: 'b', label: 'Turno', type: 'select', required: false, options: ['Manhã', 'Tarde'] },
    { id: 'c', label: 'Queixa', type: 'textarea', required: true },
  ];

  it('valida obrigatórias e ignora opção fora da lista', () => {
    const { answers, missing } = collectCustomAnswers(questions, { a: 'Talvez', b: 'Tarde', c: ' ' });
    expect(answers).toEqual([{ id: 'b', label: 'Turno', answer: 'Tarde' }]);
    expect(missing.map((q) => q.id)).toEqual(['a', 'c']);
  });

  it('formata as respostas para as observações do lead', () => {
    const { answers } = collectCustomAnswers(questions, { a: 'Sim', c: 'Dor no dente' });
    expect(formatCustomAnswersNotes(answers)).toBe(
      'Respostas do formulário:\n- Já usou aparelho?: Sim\n- Queixa: Dor no dente',
    );
    expect(formatCustomAnswersNotes([])).toBeNull();
  });
});

describe('integração com capture_config', () => {
  const cfg = {
    initial_stage: 'new' as const,
    custom_questions: [{ id: 'a', label: 'Idade', type: 'text' as const, required: false }],
  };

  it('resolveCaptureConfig devolve as perguntas normalizadas', () => {
    expect(resolveCaptureConfig(cfg).custom_questions).toEqual(cfg.custom_questions);
  });

  it('payload público mantém as perguntas e oculta a etapa do CRM', () => {
    const pub = sanitizePublicCaptureConfig(cfg);
    expect(pub.custom_questions).toEqual(cfg.custom_questions);
    expect(pub).not.toHaveProperty('initial_stage');
  });
});
