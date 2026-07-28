/** Tipos do módulo Healthcare Smart Hub (Fase 1) */

export type SmartHubStatus = 'draft' | 'published' | 'offline' | 'archived';
export type SmartHubPageStatus = 'draft' | 'published' | 'archived';
export type SmartHubButtonType =
  | 'link'
  | 'whatsapp'
  | 'phone'
  | 'email'
  | 'map'
  | 'video'
  | 'form'
  | 'internal'
  | 'social';
export type SmartHubButtonStatus = 'active' | 'inactive' | 'archived';
export type SmartHubEntityStatus = 'active' | 'inactive' | 'archived' | 'pending' | 'error';

export interface SmartHub {
  id: string;
  clinic_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  background_url: string | null;
  theme: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  seo_title: string | null;
  seo_description: string | null;
  favicon_url: string | null;
  status: SmartHubStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubPage {
  id: string;
  clinic_id: string;
  hub_id: string;
  title: string;
  slug: string;
  layout_json: Record<string, unknown>;
  is_home: boolean;
  status: SmartHubPageStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubButton {
  id: string;
  clinic_id: string;
  hub_id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  type: SmartHubButtonType;
  url: string | null;
  image: string | null;
  background_color: string | null;
  text_color: string | null;
  visible: boolean;
  order_index: number;
  track_click: boolean;
  status: SmartHubButtonStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  json_layout: Record<string, unknown>;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubTheme {
  id: string;
  clinic_id: string;
  hub_id: string;
  theme_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  button_radius: string;
  font_family: string;
  custom_css: string | null;
  config_json: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubAsset {
  id: string;
  clinic_id: string;
  hub_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  public_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubDomain {
  id: string;
  clinic_id: string;
  hub_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_token: string | null;
  ssl_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface SmartHubVisit {
  id: string;
  clinic_id: string;
  hub_id: string;
  visitor_id: string | null;
  session_id: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SmartHubClick {
  id: string;
  clinic_id: string;
  hub_id: string;
  button_id: string | null;
  visit_id: string | null;
  target_url: string | null;
  device_type: string | null;
  referrer: string | null;
  utm_campaign: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SmartHubEvent {
  id: string;
  clinic_id: string;
  hub_id: string;
  event_type: string;
  event_name: string | null;
  payload: Record<string, unknown>;
  visit_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PublicSmartHubPayload {
  hub: SmartHub;
  theme: SmartHubTheme | null;
  buttons: SmartHubButton[];
  page: SmartHubPage | null;
  assets: SmartHubAsset[];
}

/** Métricas do dashboard (placeholder até Fase Analytics) */
export interface SmartHubDashboardMetrics {
  publicUrl: string;
  status: SmartHubStatus;
  online: boolean;
  views: number;
  clicks: number;
  leads: number;
  appointments: number;
  conversions: number;
  ctr: number;
  topButton: string | null;
  mainOrigin: string | null;
  mainDevice: string | null;
  mainCampaign: string | null;
  lastVisitAt: string | null;
}

export interface ListQueryParams {
  clinicId: string;
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SmartHubInsert = Partial<SmartHub> & {
  clinic_id: string;
  slug: string;
  title: string;
};

export type SmartHubUpdate = Partial<Omit<SmartHub, 'id' | 'clinic_id' | 'created_at'>>;

export type SmartHubButtonInsert = Partial<SmartHubButton> & {
  clinic_id: string;
  hub_id: string;
  title: string;
};

export type SmartHubButtonUpdate = Partial<Omit<SmartHubButton, 'id' | 'clinic_id' | 'hub_id' | 'created_at'>>;
