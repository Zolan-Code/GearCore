import { supabase } from './supabaseClient';

function getNormalizedApiUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').trim();
  // Quitar barras finales
  url = url.replace(/\/+$/, '');
  // Asegurar que termine en /api (el prefijo global de NestJS)
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

function buildRequestUrl(endpoint: string): string {
  const base = getNormalizedApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

/**
 * Obtiene un token de acceso válido de Supabase, refrescándolo si ya expiró o está por expirar.
 */
async function getFreshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;

  // Si no hay sesión o el token expira en menos de 60 segundos, refrescar
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (session && session.expires_at && session.expires_at - nowInSeconds < 60) {
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    if (!error && refreshData.session) {
      session = refreshData.session;
    }
  }

  return session?.access_token || null;
}

export async function fetchWithAuth<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  let token = await getFreshAccessToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = buildRequestUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el backend responde 401 por token expirado, intentar refrescar una vez y reintentar
  if (response.status === 401 && !isRetry) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session?.access_token) {
      return fetchWithAuth<T>(endpoint, options, true);
    }
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(responseData?.message)
      ? responseData.message.join(' | ')
      : responseData?.message || `Error en la petición (${response.status})`;
    throw new Error(message);
  }

  return responseData;
}
