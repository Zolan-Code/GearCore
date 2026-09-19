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
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    );
    const { data } = await Promise.race([sessionPromise, timeoutPromise]);
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
  } catch {
    return null;
  }
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
  
  // Timeout de 30 segundos para soportar operaciones transaccionales hacia Supabase
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr?.name === 'AbortError' || fetchErr?.message?.includes('aborted')) {
      throw new Error('Tiempo de espera agotado al conectar con el servidor (timeout de 30s). Por favor reintente.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

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

export async function fetchBlobWithAuth(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<Blob> {
  let token = await getFreshAccessToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = buildRequestUrl(endpoint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr?.name === 'AbortError' || fetchErr?.message?.includes('aborted')) {
      throw new Error('Tiempo de espera agotado al descargar el documento (timeout de 30s). Por favor reintente.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  // Si el backend responde 401 por token expirado, intentar refrescar una vez y reintentar
  if (response.status === 401 && !isRetry) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session?.access_token) {
      return fetchBlobWithAuth(endpoint, options, true);
    }
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const message = Array.isArray(errorJson?.message)
      ? errorJson.message.join(' | ')
      : errorJson?.message || `Error al descargar el archivo (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  return response.blob();
}

