const CLIENT_ID_KEY = 'pulsefx_client_id';

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function persistClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  document.cookie = `${CLIENT_ID_KEY}=${clientId}; path=/; max-age=31536000; SameSite=Lax`;
}

// localStorage and the cookie are meant to mirror each other, but clearing
// one (browser "clear site data" pickers often let you clear storage
// without touching cookies, or vice versa) shouldn't orphan the favorites
// tied to the surviving copy — so fall back to the cookie before minting a
// new identity, and re-sync both once we know which id is the real one.
export function getClientId(): string {
  const fromStorage = localStorage.getItem(CLIENT_ID_KEY);
  if (fromStorage) {
    return fromStorage;
  }

  const fromCookie = readCookie(CLIENT_ID_KEY);
  if (fromCookie) {
    persistClientId(fromCookie);
    return fromCookie;
  }

  const clientId = generateClientId();
  persistClientId(clientId);
  return clientId;
}
