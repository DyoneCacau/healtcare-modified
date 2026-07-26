import { describe, expect, it } from 'vitest';
import {
  collectLeadFields,
  isLeadDedupeMode,
  isLeadSourceValue,
  LEAD_DEDUPE_MODES,
  LEAD_SOURCE_VALUES,
  normalizeLeadCpf,
  normalizeLeadEmail,
  normalizeLeadPayload,
  normalizeLeadPhone,
  parseLeadValue,
  resolveLeadSource,
  unwrapLeadPayload,
} from '../../supabase/functions/_shared/leadPayload.ts';

describe('normalização de telefone', () => {
  it('mantém apenas dígitos', () => {
    expect(normalizeLeadPhone('(11) 98888-7777')).toBe('11988887777');
  });

  it('remove o código do país quando sobra DDD + número', () => {
    expect(normalizeLeadPhone('+55 11 98888-7777')).toBe('11988887777');
    expect(normalizeLeadPhone('5511988887777')).toBe('11988887777');
  });

  it('descarta valor curto demais para ser telefone', () => {
    expect(normalizeLeadPhone('1234')).toBeNull();
    expect(normalizeLeadPhone(null)).toBeNull();
  });

  it('preserva número internacional que não é do Brasil', () => {
    expect(normalizeLeadPhone('+1 415 555 2671')).toBe('14155552671');
  });
});

describe('normalização de e-mail e CPF', () => {
  it('valida e normaliza e-mail', () => {
    expect(normalizeLeadEmail('  Maria@Exemplo.COM ')).toBe('maria@exemplo.com');
    expect(normalizeLeadEmail('sem-arroba')).toBeNull();
  });

  it('aceita CPF só com 11 dígitos', () => {
    expect(normalizeLeadCpf('123.456.789-09')).toBe('12345678909');
    expect(normalizeLeadCpf('123')).toBeNull();
  });
});

describe('valor estimado', () => {
  it('entende formato brasileiro', () => {
    expect(parseLeadValue('R$ 1.500,00')).toBe(1500);
    expect(parseLeadValue('1.234,56')).toBe(1234.56);
  });

  it('entende formato com ponto decimal', () => {
    expect(parseLeadValue('1500.50')).toBe(1500.5);
    expect(parseLeadValue('1500')).toBe(1500);
  });

  it('ignora texto sem número', () => {
    expect(parseLeadValue('a combinar')).toBeNull();
    expect(parseLeadValue(null)).toBeNull();
  });
});

describe('origem do lead', () => {
  it('traduz variações comuns', () => {
    expect(resolveLeadSource('Instagram')).toBe('instagram');
    expect(resolveLeadSource('ig')).toBe('instagram');
    expect(resolveLeadSource('FB')).toBe('facebook');
    expect(resolveLeadSource('WhatsApp')).toBe('whatsapp');
    expect(resolveLeadSource('indicação')).toBe('referral');
    expect(resolveLeadSource('tráfego pago')).toBe('paid_traffic');
    expect(resolveLeadSource('google ads')).toBe('paid_traffic');
  });

  it('cai em other quando não reconhece', () => {
    expect(resolveLeadSource('feira de saúde')).toBe('other');
    expect(resolveLeadSource(null)).toBeNull();
  });
});

describe('descascar envelopes', () => {
  it('entra em data / body / lead', () => {
    expect(unwrapLeadPayload({ body: { lead: { nome: 'Ana' } } })).toEqual({ nome: 'Ana' });
  });

  it('entra no primeiro item de uma lista', () => {
    expect(unwrapLeadPayload([{ nome: 'Ana' }])).toEqual({ nome: 'Ana' });
  });

  it('entende o webhook do Meta', () => {
    const payload = {
      entry: [
        {
          changes: [
            { field: 'leadgen', value: { leadgen_id: '99', form_id: '7' } },
          ],
        },
      ],
    };
    expect(unwrapLeadPayload(payload)).toEqual({ leadgen_id: '99', form_id: '7' });
  });
});

describe('achatamento de campos', () => {
  it('lê lista field_data do Meta', () => {
    const fields = collectLeadFields({
      field_data: [
        { name: 'full_name', values: ['Maria Souza'] },
        { name: 'phone_number', values: ['+5511988887777'] },
      ],
    });
    expect(fields.fullname).toBe('Maria Souza');
    expect(fields.phonenumber).toBe('+5511988887777');
  });

  it('lê listas de formulário com label/value', () => {
    const fields = collectLeadFields({
      fields: [
        { label: 'Nome', value: 'Bruno' },
        { label: 'E-mail', value: 'bruno@exemplo.com' },
      ],
    });
    expect(fields.nome).toBe('Bruno');
    expect(fields.email).toBe('bruno@exemplo.com');
  });

  it('lê um nível de aninhamento', () => {
    const fields = collectLeadFields({ contact: { phone: '11988887777' }, utm: { source: 'ig' } });
    expect(fields.phone).toBe('11988887777');
    expect(fields.source).toBe('ig');
  });
});

describe('normalizeLeadPayload', () => {
  it('normaliza JSON plano em português', () => {
    const lead = normalizeLeadPayload({
      nome: 'Maria Souza',
      telefone: '(11) 98888-7777',
      'e-mail': 'MARIA@exemplo.com',
      origem: 'instagram',
      interesse: 'Harmonização facial',
      valor: 'R$ 1.500,00',
      observacao: 'Prefere atendimento à tarde',
    });

    expect(lead.name).toBe('Maria Souza');
    expect(lead.phone).toBe('11988887777');
    expect(lead.email).toBe('maria@exemplo.com');
    expect(lead.leadSource).toBe('instagram');
    expect(lead.interest).toBe('Harmonização facial');
    expect(lead.estimatedValue).toBe(1500);
    expect(lead.notes).toBe('Prefere atendimento à tarde');
    expect(lead.stage).toBe('new');
    expect(lead.warnings).toEqual([]);
  });

  it('normaliza lead do Facebook Lead Ads', () => {
    const lead = normalizeLeadPayload(
      {
        entry: [
          {
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: '1234567890',
                  field_data: [
                    { name: 'full_name', values: ['João Pereira'] },
                    { name: 'phone_number', values: ['+55 (11) 97777-6666'] },
                    { name: 'email', values: ['joao@exemplo.com'] },
                  ],
                },
              },
            ],
          },
        ],
      },
      { provider: 'facebook_lead_ads' },
    );

    expect(lead.name).toBe('João Pereira');
    expect(lead.phone).toBe('11977776666');
    expect(lead.email).toBe('joao@exemplo.com');
    expect(lead.externalLeadId).toBe('1234567890');
    expect(lead.leadSource).toBe('facebook');
  });

  it('usa a origem do provedor quando o payload não informa', () => {
    expect(normalizeLeadPayload({ nome: 'Ana' }, { provider: 'instagram_lead_ads' }).leadSource)
      .toBe('instagram');
    expect(normalizeLeadPayload({ nome: 'Ana' }, { provider: 'n8n' }).leadSource).toBe('other');
  });

  it('respeita a origem explícita do payload sobre a do provedor', () => {
    const lead = normalizeLeadPayload(
      { nome: 'Ana', origem: 'indicação' },
      { provider: 'facebook_lead_ads' },
    );
    expect(lead.leadSource).toBe('referral');
  });

  it('combina primeiro e último nome', () => {
    const lead = normalizeLeadPayload({ first_name: 'Carla', last_name: 'Dias' });
    expect(lead.name).toBe('Carla Dias');
  });

  it('não perde lead sem nome: usa o contato e avisa', () => {
    const lead = normalizeLeadPayload({ telefone: '11988887777' });
    expect(lead.name).toBe('11988887777');
    expect(lead.warnings).toHaveLength(1);
    expect(lead.notes).toContain('Lead sem nome');
  });

  it('registra aviso quando não há nome nem contato', () => {
    const lead = normalizeLeadPayload({ interesse: 'Botox' });
    expect(lead.name).toBe('Lead sem identificação');
    expect(lead.phone).toBeNull();
    expect(lead.warnings).toHaveLength(1);
  });

  it('traduz etapa em português', () => {
    expect(normalizeLeadPayload({ nome: 'Ana', etapa: 'agendado' }).stage).toBe('scheduled');
    expect(normalizeLeadPayload({ nome: 'Ana', stage: 'won' }).stage).toBe('won');
    expect(normalizeLeadPayload({ nome: 'Ana', etapa: 'inventada' }).stage).toBe('new');
  });

  it('expõe chaves de deduplicação por contato', () => {
    const lead = normalizeLeadPayload({
      nome: 'Ana',
      celular: '+55 11 98888-7777',
      email: 'ANA@exemplo.com',
    });
    expect(lead.phoneDedupeKey).toBe('1988887777');
    expect(lead.emailDedupeKey).toBe('ana@exemplo.com');
  });

  it('a chave do telefone ignora formatação e código do país', () => {
    const keys = [
      '(11) 98888-7777',
      '11988887777',
      '+55 11 98888-7777',
      '5511988887777',
    ].map((phone) => normalizeLeadPayload({ nome: 'Ana', telefone: phone }).phoneDedupeKey);

    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('1988887777');
  });

  it('aceita payload vazio sem quebrar', () => {
    const lead = normalizeLeadPayload(null);
    expect(lead.name).toBe('Lead sem identificação');
    expect(lead.externalLeadId).toBeNull();
  });
});

describe('validação de enum da API (400, não 500)', () => {
  it('aceita só as origens do CHECK do banco', () => {
    for (const value of LEAD_SOURCE_VALUES) {
      expect(isLeadSourceValue(value)).toBe(true);
    }
    expect(isLeadSourceValue('tiktok')).toBe(false);
    expect(isLeadSourceValue('Instagram')).toBe(false);
  });

  it('aceita só os modos de dedupe documentados', () => {
    for (const value of LEAD_DEDUPE_MODES) {
      expect(isLeadDedupeMode(value)).toBe(true);
    }
    expect(isLeadDedupeMode('fuzzy')).toBe(false);
  });
});
