const CLIENT_ID_KEY = 'pulsefx_client_id';

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getClientId(): string {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const clientId = generateClientId();
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  document.cookie = `${CLIENT_ID_KEY}=${clientId}; path=/; max-age=31536000; SameSite=Lax`;
  return clientId;
}
