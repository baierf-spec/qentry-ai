export interface Env {
  DB: D1Database;
  QUEUE: DurableObjectNamespace;
  ASSETS: Fetcher;
  APP_URL: string;
  ADMIN_EMAILS: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}
