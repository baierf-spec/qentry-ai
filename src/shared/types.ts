// Types shared by the Worker and the browser app.

export type Lang = 'en' | 'es' | 'zh' | 'vi' | 'fr' | 'ru' | 'uk' | 'pl' | 'pt' | 'ko' | 'ar' | 'lt';

export const LANGS: { code: Lang; label: string; speech: string }[] = [
  { code: 'en', label: 'English', speech: 'en-US' },
  { code: 'es', label: 'Español', speech: 'es-US' },
  { code: 'zh', label: '中文', speech: 'zh-CN' },
  { code: 'vi', label: 'Tiếng Việt', speech: 'vi-VN' },
  { code: 'fr', label: 'Français', speech: 'fr-FR' },
  { code: 'pt', label: 'Português', speech: 'pt-BR' },
  { code: 'ko', label: '한국어', speech: 'ko-KR' },
  { code: 'ar', label: 'العربية', speech: 'ar-SA' },
  { code: 'ru', label: 'Русский', speech: 'ru-RU' },
  { code: 'uk', label: 'Українська', speech: 'uk-UA' },
  { code: 'pl', label: 'Polski', speech: 'pl-PL' },
  { code: 'lt', label: 'Lietuvių', speech: 'lt-LT' }
];

export interface Service {
  id: string;
  name: string;
  names: Record<string, string>;
  minutes: number;
}

export interface Station {
  id: string;
  name: string;
  staffName: string;
}

export type Hours = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string>;

export interface BusinessConfig {
  id: string;
  slug: string;
  name: string;
  address: string;
  timezone: string;
  color: string;
  layout: 'split' | 'big' | 'list';
  languages: string[];
  greeting: Record<string, string>;
  hours: Partial<Hours>;
  headsUp: number;
  holdMin: number;
  maxLen: number;
  voice: boolean;
  plan: string;
  services: Service[];
  stations: Station[];
}

export type EntryStatus = 'waiting' | 'called';

/** A person currently in the line (lives inside the Durable Object). */
export interface Entry {
  id: string;
  ticket: string;
  name: string;
  serviceId: string | null;
  lang: string;
  joinedAt: number;
  status: EntryStatus;
  stationId?: string;
  calledAt?: number;
  token: string;
  phone?: boolean; // false for walk-ins added by staff
}

export interface PublicStation {
  id: string;
  name: string;
  staffName: string;
  current: { ticket: string; name: string; since: number } | null;
}

export interface CallEvent {
  ticket: string;
  name: string;
  stationName: string;
  lang: string;
  at: number;
}

/** What every screen receives over the WebSocket. */
export interface Snapshot {
  business: Pick<BusinessConfig, 'name' | 'slug' | 'address' | 'color' | 'layout' | 'languages' | 'greeting' | 'voice' | 'headsUp' | 'holdMin'>;
  services: Service[];
  stations: PublicStation[];
  waiting: { ticket: string; name: string; eta: number }[];
  count: number;
  waitMinutes: number;
  paused: boolean;
  full: boolean;
  lastCall: CallEvent | null;
  /** only for the customer who owns the ticket */
  me?: {
    id: string;
    ticket: string;
    name: string;
    status: EntryStatus | 'gone';
    position: number;
    eta: number;
    stationName?: string;
    serviceId: string | null;
    calledAt?: number;
  };
  /** only for staff */
  entries?: (Omit<Entry, 'token'> & { eta: number })[];
}
