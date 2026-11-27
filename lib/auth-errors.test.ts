import { describe, it, expect } from 'vitest';
import { getAuthFormErrorMessage } from './auth-errors';

describe('getAuthFormErrorMessage', () => {
  it('explains invalid credentials without blaming only password', () => {
    const msg = getAuthFormErrorMessage(
      { status: 401, data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } } },
      'login'
    );
    expect(msg).toContain('Invalid email or password');
    expect(msg).toContain('email');
  });

  it('preserves account disabled 401 message', () => {
    const msg = getAuthFormErrorMessage(
      { status: 401, data: { error: { code: 'UNAUTHORIZED', message: 'Account is disabled' } } },
      'login'
    );
    expect(msg).toBe('Account is disabled');
  });

  it('maps rate-limit 429 cleanly', () => {
    const msg = getAuthFormErrorMessage(
      { status: 429, data: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } } },
      'login'
    );
    expect(msg).toContain('Too many attempts');
  });

  it('maps network errors cleanly', () => {
    expect(getAuthFormErrorMessage({ status: 0 }, 'login')).toContain('Cannot reach the server');
  });
});
