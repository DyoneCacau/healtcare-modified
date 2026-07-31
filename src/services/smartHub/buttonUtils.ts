import type { SmartHubButtonType, SmartHubStatus } from '@/types/smartHub';
import { SMART_HUB_STATUS_LABELS as STATUS_LABELS_FROM_TYPES } from '@/types/smartHub';
import { buildDestinationUrl } from './buttonDestinations';

/** Reexporta labels oficiais dos types (evita tipagem antiga divergente). */
export const SMART_HUB_STATUS_LABELS = STATUS_LABELS_FROM_TYPES;

export function normalizeHubStatus(status: SmartHubStatus): SmartHubStatus {
  // Schema atual usa `offline` (rótulo "Pausado"); sem status `paused` legado.
  return status;
}

export function isHubOnline(status: SmartHubStatus): boolean {
  return status === 'published';
}

export const BUTTON_TYPE_OPTIONS: {
  value: SmartHubButtonType;
  label: string;
  placeholder: string;
}[] = [
  { value: 'whatsapp', label: 'WhatsApp', placeholder: '5511999999999 ou link wa.me' },
  { value: 'appointment', label: 'Agendamento', placeholder: 'URL externa ou WhatsApp' },
  { value: 'phone', label: 'Ligação', placeholder: '(11) 99999-9999' },
  { value: 'email', label: 'E-mail', placeholder: 'contato@clinica.com' },
  { value: 'instagram', label: 'Instagram', placeholder: '@clinica ou URL' },
  { value: 'facebook', label: 'Facebook', placeholder: 'URL do Facebook' },
  { value: 'tiktok', label: 'TikTok', placeholder: '@clinica ou URL' },
  { value: 'youtube', label: 'YouTube', placeholder: 'URL do canal ou vídeo' },
  { value: 'map', label: 'Google Maps', placeholder: 'URL do Google Maps' },
  { value: 'site', label: 'Site', placeholder: 'https://www.clinica.com' },
  { value: 'link', label: 'Link externo', placeholder: 'https://...' },
  { value: 'procedure', label: 'Procedimentos', placeholder: 'URL ou página interna' },
  { value: 'info', label: 'Texto informativo', placeholder: 'Opcional' },
  { value: 'form', label: 'Formulário', placeholder: 'Opcional' },
  { value: 'video', label: 'Vídeo', placeholder: 'URL do vídeo' },
  { value: 'internal', label: 'Página interna', placeholder: 'slug ou path' },
  { value: 'social', label: 'Rede social', placeholder: 'URL do perfil' },
];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isUnsafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  );
}

export function ensureHttpsUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return trimmed;
  return `https://${trimmed}`;
}

/** Alias compatível com o WIP — usa o contrato atual de destinos. */
export function buildButtonHref(
  type: SmartHubButtonType,
  raw: string | null | undefined,
  whatsappMessage?: string | null,
  emailSubject?: string | null
): string | null {
  if (raw && isUnsafeUrl(raw)) return null;
  return buildDestinationUrl(type, raw, whatsappMessage, emailSubject);
}

export function validateButtonInput(input: {
  title: string;
  type: SmartHubButtonType;
  url?: string | null;
}): { valid: boolean; error?: string } {
  if (!input.title.trim()) {
    return { valid: false, error: 'Informe o título do botão.' };
  }
  if (input.type === 'info') {
    return { valid: true };
  }
  if (!input.url?.trim()) {
    return { valid: false, error: 'Informe o destino do botão.' };
  }
  if (isUnsafeUrl(input.url)) {
    return { valid: false, error: 'Este link não é permitido.' };
  }
  if (input.type === 'email' && !isValidEmail(input.url.replace(/^mailto:/i, ''))) {
    return { valid: false, error: 'Informe um e-mail válido.' };
  }
  if (input.type === 'whatsapp') {
    const digits = digitsOnly(input.url);
    const isWaLink = input.url.includes('wa.me') || input.url.includes('whatsapp');
    if (!isWaLink && digits.length < 10) {
      return { valid: false, error: 'Informe um WhatsApp válido com DDI e DDD.' };
    }
  }
  if (['site', 'link', 'map', 'youtube', 'facebook', 'appointment', 'procedure'].includes(input.type)) {
    try {
      const href = buildButtonHref(input.type, input.url);
      if (!href) return { valid: false, error: 'URL inválida.' };
      if (href.startsWith('http')) new URL(href);
    } catch {
      return { valid: false, error: 'URL inválida.' };
    }
  }
  return { valid: true };
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function getOrCreateVisitorSession(): { visitorId: string; sessionId: string } {
  const visitorKey = 'smart_hub_vid';
  const sessionKey = 'smart_hub_sid';
  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(visitorKey, visitorId);
  }
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(sessionKey, sessionId);
  }
  return { visitorId, sessionId };
}

export function parseUtmParams(search: string): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  const params = new URLSearchParams(search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
}

export const BUTTON_STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rounded', label: 'Arredondado' },
  { value: 'capsule', label: 'Cápsula' },
  { value: 'square', label: 'Quadrado' },
  { value: 'outline', label: 'Contorno' },
  { value: 'soft', label: 'Suave' },
  { value: 'shadow', label: 'Com sombra' },
];

export const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Roboto',
  'Open Sans',
  'Lato',
];
