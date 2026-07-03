import axios, { AxiosError, type AxiosResponse } from 'axios';

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 3;

export interface HttpClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  logger?: Pick<Console, 'warn'>;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    return true;
  }
  return isRetryableStatus(error.response.status);
}

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: HttpClientOptions = {},
): Promise<HttpResponse<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    attempt += 1;

    try {
      const response: AxiosResponse<T> = await axios.get<T>(url, {
        timeout: timeoutMs,
        validateStatus: () => true,
      });

      if (!response.status || (response.status >= 400 && isRetryableStatus(response.status) && attempt < maxRetries)) {
        options.logger?.warn(`Retryable HTTP ${response.status} for ${url}, attempt ${attempt}`);
        await sleep(2 ** attempt * 250);
        continue;
      }

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof AxiosError && isRetryableError(error) && attempt < maxRetries) {
        options.logger?.warn(`Network error for ${url}, attempt ${attempt}`);
        await sleep(2 ** attempt * 250);
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed after retries');
}

export function formatBcbDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}-${day}-${year}`;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
