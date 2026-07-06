import { beforeEach, describe, expect, it } from 'vitest';
import { getClientId } from './client-id.js';

function clearCookies(): void {
  document.cookie.split('; ').forEach((entry) => {
    const name = entry.split('=')[0];
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  });
}

describe('getClientId', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
  });

  it('generates a new id and persists it to both localStorage and a cookie when neither exists', () => {
    const id = getClientId();

    expect(id).toBeTruthy();
    expect(localStorage.getItem('pulsefx_client_id')).toBe(id);
    expect(document.cookie).toContain(`pulsefx_client_id=${id}`);
  });

  it('reuses the id already in localStorage without generating a new one', () => {
    localStorage.setItem('pulsefx_client_id', 'existing-client-id');

    expect(getClientId()).toBe('existing-client-id');
  });

  it('recovers the id from the cookie when localStorage was cleared, and re-syncs it back', () => {
    document.cookie = 'pulsefx_client_id=cookie-only-client-id; path=/';

    const id = getClientId();

    expect(id).toBe('cookie-only-client-id');
    expect(localStorage.getItem('pulsefx_client_id')).toBe('cookie-only-client-id');
  });
});
