import { describe, it, expect } from 'vitest';
import { suggestEmailCorrection } from './email-typo';

describe('suggestEmailCorrection', () => {
  it('suggests gmail.com for common gmail domain typos', () => {
    expect(suggestEmailCorrection('maheshsaini10101@gamil.com')).toBe('maheshsaini10101@gmail.com');
    expect(suggestEmailCorrection('  Alice@GMIAL.COM  ')).toBe('Alice@gmail.com');
    expect(suggestEmailCorrection('user@gmail.con')).toBe('user@gmail.com');
  });

  it('suggests other common provider domain corrections', () => {
    expect(suggestEmailCorrection('user@yaho.com')).toBe('user@yahoo.com');
    expect(suggestEmailCorrection('user@hotmal.com')).toBe('user@hotmail.com');
    expect(suggestEmailCorrection('user@outlok.com')).toBe('user@outlook.com');
  });

  it('returns null for valid domains or incomplete addresses', () => {
    expect(suggestEmailCorrection('user@gmail.com')).toBeNull();
    expect(suggestEmailCorrection('user@nebron.com')).toBeNull();
    expect(suggestEmailCorrection('invalid')).toBeNull();
    expect(suggestEmailCorrection('@gamil.com')).toBeNull();
  });
});
